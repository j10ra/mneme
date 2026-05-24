// Minimal MCP JSON-RPC server. We implement the subset of MCP that
// matters for our one tool (mneme.sql): initialize, tools/list, tools/call,
// notifications/initialized, ping. No SDK dep, no streaming.

import { Logger, errorMessageOf, mnemeFn } from "@mneme/core";
import { readerSql, sql } from "../infra/db.ts";
import {
  RECALL_LTP_FULL,
  RECALL_LTP_PARTIAL,
  RECALL_LTP_PARTIAL_ROW_CAP,
} from "../infra/config.ts";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "mneme";
const SERVER_VERSION = "0.1.0";
const DEFAULT_LIMIT = 50;
const RESULT_BYTE_CAP = 1024 * 1024;

// ---------------------------------------------------------------------------
// JSON-RPC types
// ---------------------------------------------------------------------------
type JsonRpcId = string | number | null;
type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};
type JsonRpcSuccess = { jsonrpc: "2.0"; id: JsonRpcId; result: unknown };
type JsonRpcError = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: { code: number; message: string; data?: unknown };
};
type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

const ERR_PARSE = -32700;
const ERR_INVALID = -32600;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;
const ERR_INTERNAL = -32603;

// ---------------------------------------------------------------------------
// Tool: mneme_sql (was mneme.sql before 1.0.58 — the dot tripped Claude
// Code's tool-name dispatcher in some agent contexts. Server still
// accepts both names in tools/call so old plugin caches keep working
// during the rollout window.)
// ---------------------------------------------------------------------------
const TOOL_NAME = "mneme_sql";
const LEGACY_TOOL_NAME = "mneme.sql";
const TOOL_DEF = {
  name: TOOL_NAME,
  description:
    "Execute a read-only SELECT against Mneme's Postgres. " +
    "Use embed('text') macro for semantic search (substituted with a 384-dim vector before execution). " +
    "Combine with `<=>` for cosine distance and `ts_rank(tsv, websearch_to_tsquery(...))` for keyword. " +
    "Auto-LIMIT 50 if absent. 5s timeout, 1MB result cap. " +
    "Response carries `rows`, `total`, and the effective `limit` — " +
    "`total === limit` means more rows may exist. " +
    "See the using-mneme skill for the schema and query templates.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "SQL SELECT statement" },
    },
    required: ["query"],
  },
};

const FORBIDDEN_RE =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|VACUUM|REINDEX|REFRESH|COPY|CALL|DO|EXECUTE|LOCK|MERGE)\b/i;

const EMBED_RE = /\bembed\(\s*'((?:[^'\\]|\\.)*)'\s*\)/gi;
const LIMIT_RE = /\bLIMIT\b\s+(\d+)/i;

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function injectLimit(sql: string): string {
  if (LIMIT_RE.test(sql)) return sql;
  return `${sql.trimEnd().replace(/;\s*$/, "")} LIMIT ${DEFAULT_LIMIT}`;
}

// Effective row cap for a query: the agent's own LIMIT if it wrote one,
// else the auto-injected default. Returned to the agent so it can tell a
// capped result (`total === limit`) from a complete one.
function effectiveLimit(sql: string): number {
  const m = LIMIT_RE.exec(sql);
  return m ? Number(m[1]) : DEFAULT_LIMIT;
}

/** The server no longer embeds anything. The per-machine MCP proxy
 *  (`packages/plugin/scripts/mcp-proxy.ts`) substitutes embed('text')
 *  → '[v1,v2,...]'::vector locally via the daemon's bge-small subprocess
 *  before the SQL hits this server. If we see an embed() macro here it
 *  means either (a) the proxy is missing/old, or (b) someone is calling
 *  /mcp directly. Reject with a clear message rather than passing
 *  malformed SQL to Postgres. */
export function rejectUnsubstitutedEmbeds(sql: string): void {
  if (EMBED_RE.test(sql)) {
    throw new Error(
      "embed() macro requires the per-machine mneme daemon to substitute it before the SQL reaches the server. " +
        "Ensure the daemon is running (`/mneme:status`) and the plugin's mcp-proxy is current.",
    );
  }
}

function capResult(rows: unknown[]): {
  rows: unknown[];
  truncated: boolean;
  total: number;
} {
  const text = JSON.stringify(rows);
  if (text.length <= RESULT_BYTE_CAP) {
    return { rows, truncated: false, total: rows.length };
  }
  const ratio = RESULT_BYTE_CAP / text.length;
  const keep = Math.max(1, Math.floor(rows.length * ratio));
  return { rows: rows.slice(0, keep), truncated: true, total: rows.length };
}

// ---------------------------------------------------------------------------
// Recall LTP (#37) — use-driven reinforcement
//
// Every successful read becomes a reinforcement event for the memories it
// actually returned, scaled by how clearly the caller intended that row.
// Marker-bearing queries (the /recall slash command injects one) and
// explicit-UUID queries both signal full intent; an anonymous query that
// narrows to ≤ N rows signals partial intent; wider scans reinforce
// nothing. Pure helpers below — exported for unit tests.
// ---------------------------------------------------------------------------

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_GLOBAL_RE = new RegExp(`\\b${UUID_PATTERN}\\b`, "gi");
const UUID_TEST_RE = new RegExp(`^${UUID_PATTERN}$`, "i");
const RECALL_MARKER_RE = /--\s*mneme:source=recall\b/i;

export function hasRecallMarker(rawQuery: string): boolean {
  return RECALL_MARKER_RE.test(rawQuery);
}

// Whole-query UUID scan. False positives only ever reinforce a row the
// agent literally typed the UUID for, which is the intended behaviour
// regardless of which SQL clause it lived in.
export function extractUuidsFromSql(sql: string): string[] {
  const out = new Set<string>();
  for (const m of sql.matchAll(UUID_GLOBAL_RE)) out.add(m[0]!.toLowerCase());
  return [...out];
}

export function extractRowIds(rows: unknown[]): string[] {
  const out = new Set<string>();
  for (const r of rows) {
    if (r && typeof r === "object" && "id" in r) {
      const id = (r as { id: unknown }).id;
      if (typeof id === "string" && UUID_TEST_RE.test(id)) out.add(id.toLowerCase());
    }
  }
  return [...out];
}

export type Reinforcement = { strength: number; ids: string[] };

// `total` is the row count BEFORE result-byte truncation (capResult.total)
// so a 30-row result that got sliced to 10 by the 1MB cap still counts
// as a wide scan, not a narrowed query.
export function chooseReinforcement(args: {
  rawQuery: string;
  rewrittenSql: string;
  rows: unknown[];
  total: number;
}): Reinforcement | null {
  // 1. /recall marker — user explicitly invoked, full strength on result ids.
  if (hasRecallMarker(args.rawQuery)) {
    const ids = extractRowIds(args.rows);
    return ids.length > 0 ? { strength: RECALL_LTP_FULL, ids } : null;
  }
  // 2. Explicit UUIDs in the query — LLM had to know them. Full strength.
  const explicit = extractUuidsFromSql(args.rewrittenSql);
  if (explicit.length > 0) {
    return { strength: RECALL_LTP_FULL, ids: explicit };
  }
  // 3. Anonymous but narrowed (total ≤ cap) — partial strength on result ids.
  if (args.total > 0 && args.total <= RECALL_LTP_PARTIAL_ROW_CAP) {
    const ids = extractRowIds(args.rows);
    return ids.length > 0 ? { strength: RECALL_LTP_PARTIAL, ids } : null;
  }
  // 4. Wide scan / no rows / no ids in projection — no-op.
  return null;
}

export async function reinforce(r: Reinforcement): Promise<void> {
  await sql`
    UPDATE memories
    SET recall_weight = recall_weight + ${r.strength}::real
    WHERE id = ANY(${r.ids})
      AND archived_at IS NULL
  `;
}

const runSql = mnemeFn(
  "mneme.sql.run",
  async (
    rawQuery: string,
  ): Promise<{ rows: unknown[]; truncated: boolean; total: number; limit: number }> => {
    const stripped = stripComments(rawQuery).trim();
    if (!stripped) throw new Error("empty query");

    // Single statement only (one optional trailing ;).
    const statements = stripped
      .replace(/;\s*$/, "")
      .split(/;/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (statements.length !== 1) {
      throw new Error("exactly one SELECT statement required");
    }
    const single = statements[0]!;

    if (!/^\s*(SELECT|WITH)\b/i.test(single)) {
      throw new Error("only SELECT (or WITH ... SELECT) allowed");
    }
    if (FORBIDDEN_RE.test(single)) {
      const m = FORBIDDEN_RE.exec(single)!;
      throw new Error(`forbidden keyword: ${m[1]}`);
    }

    rejectUnsubstitutedEmbeds(single);
    const withLimit = injectLimit(single);
    const limit = effectiveLimit(single);

    // Privacy enforcement is at the role level: mneme_reader has an RLS
    // policy on memories + captures of `USING (private = false)`. No GUC
    // dependency, no SQL-rewrite gates — the agent can run any SELECT and
    // physically cannot see private rows. The SessionStart surface uses a
    // separate code path that runs as the writer role and applies its own
    // machine-aware filter.
    const rows = await readerSql.unsafe(withLimit);
    const capped = capResult(rows as unknown[]);

    // Fire-and-forget LTP write (#37). Writes are best-effort; never bubble
    // failures back to the MCP response — same posture as the trace
    // forwarder. The agent has already done its work; we just record use.
    const reinforcement = chooseReinforcement({
      rawQuery,
      rewrittenSql: withLimit,
      rows: capped.rows,
      total: capped.total,
    });
    if (reinforcement) {
      void reinforce(reinforcement).catch((e) => {
        Logger.warn(`recall_weight reinforcement failed: ${errorMessageOf(e)}`);
      });
    }

    return { ...capped, limit };
  },
);

// ---------------------------------------------------------------------------
// JSON-RPC dispatcher
// ---------------------------------------------------------------------------
function ok(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}
function err(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcError {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

export async function dispatch(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;

  switch (req.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });

    case "notifications/initialized":
      // Notification: no response.
      return null;

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, { tools: [TOOL_DEF] });

    case "tools/call": {
      const name = req.params?.name as string | undefined;
      const args = (req.params?.arguments ?? {}) as Record<string, unknown>;
      if (name !== TOOL_NAME && name !== LEGACY_TOOL_NAME) {
        return err(id, ERR_METHOD_NOT_FOUND, `unknown tool: ${name}`);
      }
      const query = args.query;
      if (typeof query !== "string") {
        return err(id, ERR_INVALID_PARAMS, "tools/call.arguments.query must be a string");
      }
      try {
        const result = await runSql(query);
        return ok(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: false,
        });
      } catch (e) {
        const msg = errorMessageOf(e);
        Logger.warn(`mneme.sql failed: ${msg}`);
        return ok(id, {
          content: [{ type: "text", text: `error: ${msg}` }],
          isError: true,
        });
      }
    }

    default:
      return err(id, ERR_METHOD_NOT_FOUND, `unknown method: ${req.method}`);
  }
}

export async function handleHttp(body: unknown): Promise<JsonRpcResponse | null | unknown[]> {
  // Handle batch (array) or single request.
  if (Array.isArray(body)) {
    const results: JsonRpcResponse[] = [];
    for (const item of body) {
      const r = await dispatchOne(item);
      if (r) results.push(r);
    }
    return results;
  }
  return dispatchOne(body);
}

async function dispatchOne(body: unknown): Promise<JsonRpcResponse | null> {
  if (!body || typeof body !== "object") {
    return err(null, ERR_INVALID, "request must be a JSON object");
  }
  const req = body as JsonRpcRequest;
  if (req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return err(req.id ?? null, ERR_INVALID, "missing jsonrpc/method");
  }
  try {
    return await dispatch(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(req.id ?? null, ERR_INTERNAL, msg);
  }
}

export { ERR_PARSE };
