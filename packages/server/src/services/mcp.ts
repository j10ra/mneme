// Minimal MCP JSON-RPC server. We implement the subset of MCP that
// matters for our one tool (mneme.sql): initialize, tools/list, tools/call,
// notifications/initialized, ping. No SDK dep, no streaming.

import { Logger, errorMessageOf, mnemeFn } from "@mneme/core";
import { scrub } from "@mneme/shared";
import { readerSql } from "../infra/db.ts";
import { embedBatch } from "../embedder/index.ts";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "mneme";
const SERVER_VERSION = "0.1.0";
const DEFAULT_LIMIT = 200;
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
    "Use embed('text') macro for semantic search (substituted with a 1024-dim vector before execution). " +
    "Combine with `<=>` for cosine distance and `ts_rank(tsv, websearch_to_tsquery(...))` for keyword. " +
    "Auto-LIMIT 200 if absent. 5s timeout, 1MB result cap. " +
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
const LIMIT_RE = /\bLIMIT\b\s+\d+/i;

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function injectLimit(sql: string): string {
  if (LIMIT_RE.test(sql)) return sql;
  return `${sql.trimEnd().replace(/;\s*$/, "")} LIMIT ${DEFAULT_LIMIT}`;
}

// Exported for tests. Scrubs each embed argument before handing it to
// the embedder: today's local embedder is trusted, but the moment any
// remote embedder gets wired in, an agent could leak secrets by typing
// `embed('Bearer eyJ…')` into a query.
export async function substituteEmbeds(sql: string): Promise<string> {
  const matches = Array.from(sql.matchAll(EMBED_RE));
  if (matches.length === 0) return sql;
  const rawTexts = Array.from(
    new Set(matches.map((m) => m[1]!.replace(/\\'/g, "'"))),
  );
  const cleanedTexts = rawTexts.map(scrub);
  const vectors = await embedBatch(cleanedTexts);
  const embedMap = new Map(rawTexts.map((t, i) => [t, vectors[i]!]));
  return sql.replace(EMBED_RE, (_match, raw: string) => {
    const text = raw.replace(/\\'/g, "'");
    const vec = embedMap.get(text);
    if (!vec) throw new Error(`embed substitution failed for: ${text}`);
    return `'[${vec.join(",")}]'::vector`;
  });
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

const runSql = mnemeFn(
  "mneme.sql.run",
  async (rawQuery: string): Promise<{ rows: unknown[]; truncated: boolean; total: number; rewritten_sql: string }> => {
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

    const withEmbeds = await substituteEmbeds(single);
    const withLimit = injectLimit(withEmbeds);

    // Privacy enforcement is at the role level: mneme_reader has an RLS
    // policy on memories + captures of `USING (private = false)`. No GUC
    // dependency, no SQL-rewrite gates — the agent can run any SELECT and
    // physically cannot see private rows. The SessionStart surface uses a
    // separate code path that runs as the writer role and applies its own
    // machine-aware filter.
    const rows = await readerSql.unsafe(withLimit);
    const capped = capResult(rows as unknown[]);
    return { ...capped, rewritten_sql: withLimit };
  },
);

// ---------------------------------------------------------------------------
// JSON-RPC dispatcher
// ---------------------------------------------------------------------------
function ok(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}
function err(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcError {
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
