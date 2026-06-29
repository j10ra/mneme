// Minimal MCP JSON-RPC server. We implement the subset of MCP that
// matters for our one tool (mneme_sql): initialize, tools/list, tools/call,
// notifications/initialized, ping. No SDK dep, no streaming.

import { Logger, errorMessageOf, mnemeFn } from "@mneme/core";
import { readerSql, sql } from "../infra/db.ts";
import { embedQuery, serverEmbedEnabled } from "../lib/embedder.ts";
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
// Tool: mneme_sql. The legacy alias `mneme.sql` is still accepted in
// tools/call so older plugin caches keep working — the dot tripped
// Claude Code's tool-name dispatcher in some agent contexts.
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
    "Call the `mneme_guide` tool first for the schema, the 3-layer recall " +
    "workflow (search → walk → unfold), and copy-paste query templates.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "SQL SELECT statement" },
    },
    required: ["query"],
  },
};

// The using-mneme skill ships only with the Claude Code plugin. Connector
// clients (Claude desktop/web/mobile, ChatGPT, local LLMs) have just the
// tools, so the recall workflow + schema travel as this guide tool.
const GUIDE_NAME = "mneme_guide";

export const GUIDE_TEXT = `Mneme — cross-machine memory, queried read-only via mneme_sql.

THE 3-LAYER RECALL WORKFLOW (don't fetch full rows up front):

1. SEARCH — pull a light index, ranked. Semantic + keyword:
   SELECT id, kind, repo, importance, created_at,
          meta->>'in_cluster'    AS in_cluster,
          meta->>'superseded_by' AS superseded_by,
          substring(content,1,200) AS preview
   FROM memories
   WHERE archived_at IS NULL
   ORDER BY (
       0.6 * (1 - (embedding <=> embed('your query'))) +
       0.4 * ts_rank(tsv, websearch_to_tsquery('english','your query')) +
       0.05 * importance + 0.10 * ln(1 + recall_weight)
     ) * CASE WHEN meta->>'superseded_by' IS NOT NULL THEN 0.3 ELSE 1 END
       * CASE WHEN kind = 'concept' THEN 1.15 ELSE 1 END
   DESC LIMIT 10;
   embed('text') runs the bge-small model server-side. If a query errors
   on embed(), this server has embedding disabled — drop the embedding
   term and rank by ts_rank(tsv, websearch_to_tsquery('english','...')).

2. WALK — follow the graph from the IDs that matter:
   meta.in_cluster   → the cluster summary (read this before members)
   meta.member_ids   → raw members behind a cluster summary
   meta.related_to   → semantic neighbours
   meta.superseded_by→ the newer memory that replaced this one

3. UNFOLD — full content for the chosen few (1-5):
   SELECT id, content, kind, importance, repo, machine_id, created_at, meta
   FROM memories WHERE id = ANY(ARRAY['<id>']::uuid[]);

SCHEMA (public, read-only, RLS hides private rows):
  memories(id uuid, kind, content, repo, importance, recall_weight,
           machine_id, created_at, archived_at, meta jsonb, tsv, embedding)
    kind ∈ decision|bugfix|feature|preference|constraint|summary|cluster|note|concept...
    concept — curated, living unit of durable knowledge (surfaced first, recall-boosted)
    cluster rows (kind='cluster') summarize members via meta.member_ids.
  captures(...) — raw conversation/tool events; memories are distilled from these.

NOTES:
  - SELECT only; one statement; auto LIMIT 50; 5s timeout; 1MB cap.
  - total === limit in the response means more rows may exist.
  - Memories age — verify live-state claims (issue/PR status, versions,
    counts, paths) against the real source before quoting them as current.`;

const MNEME_GUIDE_TOOL = {
  name: GUIDE_NAME,
  description:
    "Returns Mneme's recall workflow, schema, and query templates. " +
    "Call this once before composing mneme_sql queries — it replaces the " +
    "using-mneme skill for clients that only have the MCP tools.",
  inputSchema: { type: "object", properties: {} },
};

// Defense-in-depth tarpit, NOT the primary control. The real boundary
// is the `mneme_reader` Postgres role this query runs under: SELECT only
// on `public.*`, no privileges on `_ops.*`, RLS `USING (private = false)`
// on memories + captures. The regex below catches typos and obvious
// abuse but Postgres has many ways past a keyword deny-list (dollar
// quoting, function aliases, etc.). If the reader role is ever granted
// new privileges, revisit `services/mcp.ts` and assume this regex blocks
// nothing.
const FORBIDDEN_RE =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|VACUUM|REINDEX|REFRESH|COPY|CALL|DO|EXECUTE|LOCK|MERGE)\b/i;

const EMBED_RE = /\bembed\(\s*'((?:[^'\\]|\\.)*)'\s*\)/gi;

// A *top-level* LIMIT sits at the tail of the statement. A LIMIT inside a
// CTE or subquery is always followed by a ")", so anchoring to end-of-string
// excludes it. This closes #57: `WITH foo AS (SELECT 1 LIMIT 9e9) SELECT *
// FROM memories` no longer reads the inner LIMIT as the outer cap.
const TOP_LIMIT_RE = /\bLIMIT\s+(\d+|ALL)\b(?:\s+OFFSET\s+\d+)?\s*$/i;

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function stripTrailingSemicolon(sql: string): string {
  return sql.trimEnd().replace(/;\s*$/, "");
}

// Inject the default row cap unless the agent already wrote a top-level
// LIMIT (an inner CTE/subquery LIMIT does not count — see TOP_LIMIT_RE).
export function injectLimit(sql: string): string {
  const clean = stripTrailingSemicolon(sql);

  if (TOP_LIMIT_RE.test(clean)) return clean;

  return `${clean} LIMIT ${DEFAULT_LIMIT}`;
}

// Effective row cap for a query: the agent's own top-level LIMIT if it wrote
// a numeric one, else the auto-injected default. Returned to the agent so it
// can tell a capped result (`total === limit`) from a complete one. A bare
// `LIMIT ALL` carries no number, so it reports as the default.
export function effectiveLimit(sql: string): number {
  const m = TOP_LIMIT_RE.exec(stripTrailingSemicolon(sql));

  return m && /^\d+$/.test(m[1]!) ? Number(m[1]) : DEFAULT_LIMIT;
}

/** Reject a bare embed() macro reaching the server. The daemon proxy
 *  normally substitutes it client-side first, so one here means a stale
 *  proxy or a direct /mcp call. No-op when MNEME_SERVER_EMBED=1. */
export function rejectUnsubstitutedEmbeds(sql: string): void {
  if (EMBED_RE.test(sql)) {
    throw new Error(
      "embed() macro requires the per-machine mneme daemon to substitute it before the SQL reaches the server. " +
        "Ensure the daemon is running (`/mneme:status`) and the plugin's mcp-proxy is current.",
    );
  }
}

/** Cheap presence check that doesn't disturb EMBED_RE's lastIndex. */
function hasEmbedMacro(sql: string): boolean {
  return /\bembed\s*\(\s*'/i.test(sql);
}

/** Resolve each embed('text') to a pgvector literal via embedFn (server
 *  embedding for connector clients, #59). Texts embed in one batch;
 *  replacements apply in match order. matchAll/replace on a global regex
 *  don't carry lastIndex between them. */
export async function substituteEmbeds(
  sql: string,
  embedFn: (texts: string[]) => Promise<number[][]>,
): Promise<string> {
  const texts: string[] = [];

  for (const m of sql.matchAll(EMBED_RE)) {
    texts.push(m[1]!.replace(/\\(.)/g, "$1"));
  }

  if (texts.length === 0) return sql;
  const vectors = await embedFn(texts);

  if (vectors.length !== texts.length) {
    throw new Error(
      `embed() substitution: expected ${texts.length} vector(s), got ${vectors.length}`,
    );
  }

  let i = 0;

  return sql.replace(EMBED_RE, () => `'[${vectors[i++]!.join(",")}]'::vector`);
}

// Columns the agent never needs back: the raw 384-dim embedding vector and
// the tsvector. Both exist only to drive WHERE/ORDER BY expressions
// (`embedding <=> embed('…')`, `ts_rank(tsv, …)`); returning them floods the
// caller's context (one embedding is ~4-6KB of JSON) and burns the byte cap
// on noise — the same bloat we already removed from the dream candidate
// query (commit c9fe8ec). Stripped by exact column name, so computed values
// (e.g. `(embedding <=> embed('x')) AS dist`) keep their alias and survive;
// `embedding_model` (a small text column) is untouched.
const INTERNAL_COLUMNS = ["embedding", "tsv"];

export function stripInternalColumns(rows: unknown[]): unknown[] {
  return rows.map((r) => {
    if (!r || typeof r !== "object") return r;
    const row = r as Record<string, unknown>;

    if (!INTERNAL_COLUMNS.some((c) => c in row)) return r;
    const copy = { ...row };

    for (const c of INTERNAL_COLUMNS) delete copy[c];

    return copy;
  });
}

function capResult(rows: unknown[]): {
  rows: unknown[];
  truncated: boolean;
  total: number;
} {
  // Strip before measuring so a fat vector can't push useful rows past the cap.
  const clean = stripInternalColumns(rows);
  const text = JSON.stringify(clean);

  if (text.length <= RESULT_BYTE_CAP) {
    return { rows: clean, truncated: false, total: clean.length };
  }

  const ratio = RESULT_BYTE_CAP / text.length;
  const keep = Math.max(1, Math.floor(clean.length * ratio));

  return { rows: clean.slice(0, keep), truncated: true, total: clean.length };
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
  // Two-step bump: first the rows that were hit, then any cluster they
  // belong to via meta.in_cluster. One real BEGIN/COMMIT so concurrent
  // readers see neither bump or both, never just the atom bump.
  //
  // Dedup policy: "one query = one signal" for the cluster, regardless
  // of how many members the result surfaced. ln(1 + recall_weight) in
  // the ranker already compresses tall counts, so the marginal value
  // of bumping N-times-per-query is in the noise; flat is cleaner. If
  // we ever want per-member-hit weighting, drop the Set.
  //
  // Direct-hit exclusion: if the cluster row itself was in r.ids it
  // already got bumped in step 1; don't bump it again via propagation
  // when one of its members is in the same result set.
  await sql.begin(async (tx) => {
    const bumped = await tx<{ cluster_id: string | null }[]>`
      UPDATE memories
      SET recall_weight = recall_weight + ${r.strength}::real
      WHERE id = ANY(${r.ids})
        AND archived_at IS NULL
      RETURNING meta->>'in_cluster' AS cluster_id
    `;
    const directIds = new Set(r.ids);
    const clusterIds = [
      ...new Set(
        bumped.map((b) => b.cluster_id).filter((v): v is string => v !== null && !directIds.has(v)),
      ),
    ];

    if (clusterIds.length === 0) return;
    // Cast the array, not the column: keeps the PK index usable, and
    // turns a bad UUID string in meta.in_cluster into an exception at
    // the cast boundary instead of a silent text-compare no-op.
    await tx`
      UPDATE memories
      SET recall_weight = recall_weight + ${r.strength}::real
      WHERE id = ANY(${clusterIds}::uuid[])
        AND kind = 'cluster'
        AND archived_at IS NULL
    `;
  });
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

    // Plugin callers arrive pre-substituted (daemon did it). A bare
    // connector sends embed('text') through: resolve it server-side when
    // enabled, else reject with the daemon-needed message.
    let prepared = single;

    if (hasEmbedMacro(single)) {
      if (serverEmbedEnabled()) {
        prepared = await substituteEmbeds(single, embedQuery);
      } else {
        rejectUnsubstitutedEmbeds(single);
      }
    }

    const withLimit = injectLimit(prepared);
    const limit = effectiveLimit(prepared);

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
      return ok(id, { tools: [TOOL_DEF, MNEME_GUIDE_TOOL] });

    case "tools/call": {
      const name = req.params?.name as string | undefined;
      const args = (req.params?.arguments ?? {}) as Record<string, unknown>;

      if (name === GUIDE_NAME) {
        return ok(id, { content: [{ type: "text", text: GUIDE_TEXT }], isError: false });
      }

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
