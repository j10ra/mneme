import { Hono } from "hono";
import {
  Logger,
  TraceStore,
  configureAuth,
  configureLogger,
  configureTraceStore,
  getTraceStore,
  mnemeRoute,
  requireAuth,
} from "@mneme/core";
import { sql, sha256Hex } from "./db.ts";
import { EMBEDDER_MODEL } from "./embedder/index.ts";
import { KINDS, type Kind } from "./llm/index.ts";
import { handleHttp as handleMcp } from "./mcp.ts";
import { scrub, scrubData } from "./scrub.ts";
import { buildSurface } from "./surface.ts";
import { startWorker, stopWorker } from "./worker/index.ts";

// Wire core to DB and env. Scrubber runs on every span input/output so
// `_ops.spans` never see raw secrets either.
configureLogger({
  jsonMode: process.env.NODE_ENV === "production",
  minLevel: "debug",
});
configureAuth(sql);
configureTraceStore(new TraceStore({ sql, scrubber: scrubData }));

const app = new Hono();

// ---------------------------------------------------------------------------
// /health — public, no auth, no scope check.
// ---------------------------------------------------------------------------
app.get("/health", mnemeRoute("health"), (c) =>
  c.json({ status: "ok", phase: 0 }),
);

// ---------------------------------------------------------------------------
// POST /api/capture — write, scope=capture
// ---------------------------------------------------------------------------
type CaptureBody = {
  content: string;
  source: string;
  machine_id: string;
  hostname: string;
  repo?: string | null;
  harness: string;
  agent?: string | null;
  session_id?: string | null;
  topics?: string[];
  private?: boolean;
  raw_meta?: Record<string, unknown>;
};

app.post(
  "/api/capture",
  mnemeRoute("api.capture"),
  requireAuth("capture"),
  async (c) => {
    const body = (await c.req.json().catch(() => null)) as CaptureBody | null;
    if (!body) return c.json({ error: "invalid_json" }, 400);

    const required = ["content", "source", "machine_id", "hostname", "harness"] as const;
    for (const field of required) {
      if (!body[field] || typeof body[field] !== "string") {
        return c.json({ error: `${field} required` }, 400);
      }
    }

    // Scrub at the edge: secrets and <private> blocks redacted before
    // hashing or storage. Hash is computed on cleaned content so dedup keys
    // align across captures whose only difference was a redacted secret.
    const cleaned = scrub(body.content);
    const hash = await sha256Hex(cleaned);

    const inserted = await sql<{ id: string }[]>`
      INSERT INTO captures (
        content, content_sha256, source, machine_id, hostname,
        repo, harness, agent, session_id, topics, private, raw_meta
      )
      VALUES (
        ${cleaned}, ${hash}, ${body.source}, ${body.machine_id}, ${body.hostname},
        ${body.repo ?? null}, ${body.harness}, ${body.agent ?? null}, ${body.session_id ?? null},
        ${body.topics ?? []}, ${body.private ?? false}, ${sql.json((body.raw_meta ?? {}) as never)}
      )
      ON CONFLICT (content_sha256, machine_id) DO NOTHING
      RETURNING id
    `;

    let id: string;
    let deduped: boolean;
    if (inserted[0]) {
      id = inserted[0].id;
      deduped = false;
      // Only enqueue extract here. The extract worker writes memory rows
      // and enqueues embed jobs per memory (keyed to memory_id).
      await sql`
        INSERT INTO ingest_jobs (capture_id, phase, state)
        VALUES (${id}, ${"extract"}, ${"queued"})
      `;
      Logger.info(
        `captured id=${id} repo=${body.repo ?? "-"} source=${body.source} chars=${cleaned.length}`,
      );
    } else {
      const existing = await sql<{ id: string }[]>`
        SELECT id FROM captures
        WHERE content_sha256 = ${hash} AND machine_id = ${body.machine_id}
        LIMIT 1
      `;
      if (!existing[0]) return c.json({ error: "insert_failed" }, 500);
      id = existing[0].id;
      deduped = true;
      Logger.info(
        `captured (deduped) id=${id} repo=${body.repo ?? "-"} source=${body.source}`,
      );
    }

    // Side-effect for kind=pin captures: flip meta.pinned on the target
    // memory. Keeps writes converging on /api/capture without needing a
    // separate route. Phase 4 worker will handle other actuated kinds.
    // Wrapped in try/catch so a malformed pin never breaks the capture
    // ingest path.
    const meta = body.raw_meta as Record<string, unknown> | undefined;
    if (
      meta &&
      meta.kind === "pin" &&
      typeof meta.target === "string"
    ) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!isUuid.test(meta.target)) {
        Logger.warn(`pin requested with invalid uuid: ${meta.target}`);
      } else {
        try {
          const value = meta.value !== false;
          const updated = await sql<{ id: string }[]>`
            UPDATE memories
            SET meta = jsonb_set(meta, '{pinned}', to_jsonb(${value}::boolean), true)
            WHERE id = ${meta.target} AND archived_at IS NULL
            RETURNING id
          `;
          Logger.info(
            updated[0]
              ? `pin actuated id=${meta.target} value=${value}`
              : `pin requested but target not found: ${meta.target}`,
          );
        } catch (e) {
          Logger.error(
            `pin actuation failed for ${meta.target}`,
            e,
          );
        }
      }
    }

    return c.json({ id, deduped });
  },
);

// ---------------------------------------------------------------------------
// POST /api/memory — write, scope=capture
// Direct-write a memory bypassing the extract worker. Used by /mneme:pin
// (pinned=true) and any future "agent-resolved-fact" slash that wants to
// land a clean self-contained sentence as a memory immediately rather than
// posting raw text and waiting for the extractor. Creates a synthetic
// capture row for provenance, inserts the memory referencing it, and
// enqueues an embed job. On chunk_id conflict (same content + same embedder)
// merges meta into the existing row so re-pinning the same fact is a no-op
// upsert rather than a duplicate.
// ---------------------------------------------------------------------------
type MemoryBody = {
  content: string;
  kind?: Kind;
  importance?: number;
  pinned?: boolean;
  machine_id: string;
  hostname: string;
  repo?: string | null;
  harness: string;
  agent?: string | null;
  session_id?: string | null;
  topics?: string[];
  private?: boolean;
};

app.post(
  "/api/memory",
  mnemeRoute("api.memory"),
  requireAuth("capture"),
  async (c) => {
    const body = (await c.req.json()) as MemoryBody;
    if (!body.content || typeof body.content !== "string") {
      return c.json({ error: "content required" }, 400);
    }
    if (!body.machine_id) return c.json({ error: "machine_id required" }, 400);
    if (!body.hostname) return c.json({ error: "hostname required" }, 400);
    if (!body.harness) return c.json({ error: "harness required" }, 400);

    const cleaned = scrub(body.content).trim();
    if (!cleaned) return c.json({ error: "content empty after scrub" }, 400);

    const kind = body.kind && (KINDS as readonly string[]).includes(body.kind) ? body.kind : "note";
    const importance = Math.max(0.1, Math.min(1, body.importance ?? 1.0));
    const pinned = body.pinned ?? false;

    const contentHash = await sha256Hex(cleaned);
    const chunkId = await sha256Hex(`${contentHash}:${EMBEDDER_MODEL}`);
    const meta = { pinned, source_slash: true };

    const result = await sql.begin(async (tx) => {
      // Synthetic capture for provenance. Distinguishable from hook-driven
      // captures via source. Re-running with the same content dedups via
      // (content_sha256, machine_id) — same as /api/capture.
      const [capRow] = await tx<{ id: string }[]>`
        INSERT INTO captures (
          content, content_sha256, source, machine_id, hostname,
          repo, harness, agent, session_id, topics, private, raw_meta
        )
        VALUES (
          ${cleaned}, ${contentHash}, ${"manual:/api/memory"}, ${body.machine_id}, ${body.hostname},
          ${body.repo ?? null}, ${body.harness}, ${body.agent ?? null}, ${body.session_id ?? null},
          ${body.topics ?? []}, ${body.private ?? false}, ${sql.json({ direct_write: true } as never)}
        )
        ON CONFLICT (content_sha256, machine_id) DO UPDATE
        SET content = EXCLUDED.content
        RETURNING id
      `;
      const captureId = capRow!.id;

      const memRows = await tx<{ id: string; created: boolean }[]>`
        INSERT INTO memories (
          capture_id, chunk_id, content, content_hash,
          embedding_model, tsv,
          kind, importance,
          machine_id, repo, harness, agent, topics, private,
          meta
        )
        VALUES (
          ${captureId}, ${chunkId}, ${cleaned}, ${contentHash},
          ${EMBEDDER_MODEL}, to_tsvector('english', ${cleaned}),
          ${kind}, ${importance},
          ${body.machine_id}, ${body.repo ?? null}, ${body.harness}, ${body.agent ?? null},
          ${body.topics ?? []}, ${body.private ?? false},
          ${sql.json(meta as never)}
        )
        ON CONFLICT (chunk_id) DO UPDATE
        SET meta = memories.meta || ${sql.json(meta as never)},
            importance = GREATEST(memories.importance, EXCLUDED.importance)
        RETURNING id, (xmax = 0) AS created
      `;
      const memId = memRows[0]!.id;
      const created = memRows[0]!.created;

      if (created) {
        await tx`
          INSERT INTO ingest_jobs (memory_id, phase, state)
          VALUES (${memId}, 'embed', 'queued')
        `;
      }

      return { id: memId, created };
    });

    Logger.info(
      `memory: id=${result.id} ${result.created ? "created" : "updated"} kind=${kind} pinned=${pinned} repo=${body.repo ?? "-"} chars=${cleaned.length}`,
    );
    return c.json({ id: result.id, created: result.created, pinned });
  },
);

// ---------------------------------------------------------------------------
// POST /api/session/start — read, scope=read
// Aggregates pinned + rules + recent decisions + recent sessions for a set of
// repos (workspace = N repos, single repo = length 1). Cross-machine:
// filtered by repo, unioned across machine_id. Returns rendered markdown the
// hook prints to stdout for SessionStart context injection.
// ---------------------------------------------------------------------------
type SessionStartBody = {
  machine_id?: string;
  repos?: string[];
  /** legacy single-repo field; preserved so older plugin versions still work */
  repo?: string | null;
  session_id?: string | null;
};

app.post(
  "/api/session/start",
  mnemeRoute("api.session.start"),
  requireAuth("read"),
  async (c) => {
    const body = ((await c.req.json().catch(() => ({}))) ?? {}) as SessionStartBody;
    const repos = Array.isArray(body.repos)
      ? body.repos.filter((r): r is string => typeof r === "string" && r.length > 0)
      : typeof body.repo === "string" && body.repo
        ? [body.repo]
        : [];
    const surface = await buildSurface(repos);
    return c.json(surface);
  },
);

// ---------------------------------------------------------------------------
// POST /mcp — read, scope=mcp. JSON-RPC dispatcher; one tool: mneme.sql.
// ---------------------------------------------------------------------------
app.post("/mcp", mnemeRoute("mcp"), requireAuth("mcp"), async (c) => {
  const body = await c.req.json().catch(() => null);
  if (body === null) return c.json({ error: "invalid_json" }, 400);
  const result = await handleMcp(body);
  if (result === null) return c.body(null, 204);
  return c.json(result as never);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const port = Number(process.env.PORT ?? 3100);

async function shutdown(signal: string): Promise<void> {
  Logger.info(`${signal} received, flushing traces and closing pool`);
  await stopWorker();
  try {
    await getTraceStore()?.stop();
  } finally {
    await sql.end({ timeout: 5 });
  }
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

startWorker();

Logger.info(`mneme server listening on :${port}`);

export default { port, fetch: app.fetch };
