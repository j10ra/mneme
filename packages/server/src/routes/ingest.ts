// Routes for landing content into the ingest pipeline.
//
//   POST /api/capture  → write raw text; extract worker chunks + embeds
//   POST /api/memory   → direct-write a self-contained memory; embed only
//
// Both share an edge-scrub policy: every string column that lands in storage
// runs through the same secret + <private> patterns, not just `content`.
// Originally only `content` was scrubbed, which let credentials embedded in
// `repo` (e.g. a git remote URL with `user:token@host`) flow through
// unredacted.

import { Hono, type MiddlewareHandler } from "hono";
import {
  Logger,
  currentAuth,
  mnemeRoute,
  newId,
  requireAuth,
  storage,
  type TraceContext,
} from "@mneme/core";
import { scrub, scrubData } from "@mneme/shared";

// Establishes a TraceContext for AsyncLocalStorage-dependent middleware
// (requireAuth writes auth into the store) without emitting a root span.
// Used by high-frequency self-observing endpoints where the bookkeeping
// span outweighs the signal value (e.g. /api/ingest/spans, which would
// otherwise record one span every time it receives a batch of spans).
const silentTrace: MiddlewareHandler = async (c, next) => {
  const ctx: TraceContext = {
    traceId: newId(),
    source: c.req.header("x-mneme-source") ?? "http",
    spanStack: [],
  };
  await storage.run(ctx, async () => {
    await next();
  });
};
import { sql, sha256Hex } from "../infra/db.ts";
import { actuateRawMeta } from "../lib/actuate.ts";
import { KINDS, type Kind } from "../llm/index.ts";

// Cap a single forwarded batch so a runaway daemon can't OOM the
// server's tx. Realistic daemon batches sit at ~10 traces / 50 spans
// per flush; this is a 100x ceiling.
const MAX_BATCH_TRACES = 1000;
const MAX_BATCH_SPANS = 10_000;
const MAX_BATCH_LOGS = 10_000;

type IngestSpansBody = {
  traces?: Array<{
    traceId: string;
    rootSpanName: string;
    source: string;
    startedAtMs: number;
    endedAtMs: number;
    durationMs: number;
  }>;
  spans?: Array<{
    spanId: string;
    traceId: string;
    parentSpanId?: string | null;
    name: string;
    startedAtMs: number;
    durationMs?: number | null;
    errorMessage?: string | null;
    inputSize?: number | null;
    outputSize?: number | null;
    input?: unknown;
    output?: unknown;
  }>;
  logs?: Array<{
    traceId?: string | null;
    spanId?: string | null;
    level: "debug" | "info" | "warn" | "error";
    message: string;
    ts: number;
  }>;
};

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
  /** Required. The caller (slash.ts on the user's machine) carries this
   *  from the local daemon's embedder identity. Server is label-agnostic
   *  about which embedder produced the eventual vector — it just stores
   *  what's sent and hashes chunk_id against it. */
  embedding_model: string;
  /** Short kebab-case slug for cross-machine handoff. When present, the
   *  memory's meta gets meta.handoff_slug = <slug> and the memory is
   *  resumable via /mneme:resume <slug>. Used by /mneme:handoff and the
   *  compact auto-capture path. */
  handoff_slug?: string;
};

export function mountIngestRoutes(app: Hono): void {
  // ---------------------------------------------------------------------------
  // POST /api/capture — write, scope=capture
  // ---------------------------------------------------------------------------
  app.post("/api/capture", mnemeRoute("api.capture"), requireAuth("capture"), async (c) => {
    const body = (await c.req.json().catch(() => null)) as CaptureBody | null;
    if (!body) return c.json({ error: "invalid_json" }, 400);

    // machine_id comes from the auth token (server-stamped, can't be spoofed).
    // Admin-token callers (ctx.auth.machineId === null) fall back to body for
    // curl-debugging convenience.
    const auth = currentAuth();
    const machineId =
      auth?.machineId ?? (typeof body.machine_id === "string" ? body.machine_id : "");

    const required = ["content", "source", "hostname", "harness"] as const;
    for (const field of required) {
      if (!body[field] || typeof body[field] !== "string") {
        return c.json({ error: `${field} required` }, 400);
      }
    }
    if (!machineId) return c.json({ error: "machine_id required" }, 400);

    const cleaned = scrub(body.content);
    const hash = await sha256Hex(cleaned);
    const cleanedRepo = body.repo ? scrub(body.repo) : null;
    const cleanedSource = scrub(body.source);
    const cleanedHostname = scrub(body.hostname);
    const cleanedHarness = scrub(body.harness);
    const cleanedAgent = body.agent ? scrub(body.agent) : null;
    const cleanedSessionId = body.session_id ? scrub(body.session_id) : null;
    const cleanedTopics = (body.topics ?? []).map(scrub);
    const cleanedRawMeta = scrubData(body.raw_meta ?? {}) as Record<string, unknown>;

    const inserted = await sql<{ id: string }[]>`
        INSERT INTO captures (
          content, content_sha256, source, machine_id, hostname,
          repo, harness, agent, session_id, topics, private, raw_meta
        )
        VALUES (
          ${cleaned}, ${hash}, ${cleanedSource}, ${machineId}, ${cleanedHostname},
          ${cleanedRepo}, ${cleanedHarness}, ${cleanedAgent}, ${cleanedSessionId},
          ${cleanedTopics}, ${body.private ?? false}, ${sql.json(cleanedRawMeta as never)}
        )
        ON CONFLICT (content_sha256, machine_id) DO NOTHING
        RETURNING id
      `;

    let id: string;
    let deduped: boolean;
    if (inserted[0]) {
      id = inserted[0].id;
      deduped = false;
      // Legacy path: kept for non-daemon HTTP clients. The capture row
      // is persisted, but extract/embed never happen here — those are
      // owned by the per-machine daemon and arrive via /api/bundle.
      Logger.info("captured (legacy /api/capture)", {
        id,
        repo: cleanedRepo ?? "-",
        source: cleanedSource,
        chars: cleaned.length,
      });
    } else {
      const existing = await sql<{ id: string }[]>`
          SELECT id FROM captures
          WHERE content_sha256 = ${hash} AND machine_id = ${machineId}
          LIMIT 1
        `;
      if (!existing[0]) return c.json({ error: "insert_failed" }, 500);
      id = existing[0].id;
      deduped = true;
      Logger.info("captured (deduped)", {
        id,
        repo: cleanedRepo ?? "-",
        source: cleanedSource,
      });
    }

    // Side-effecting captures (pin / archive / supersede) actuate here.
    await actuateRawMeta(sql, body.raw_meta as Record<string, unknown> | undefined);

    return c.json({ id, deduped });
  });

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
  app.post("/api/memory", mnemeRoute("api.memory"), requireAuth("capture"), async (c) => {
    const body = (await c.req.json()) as MemoryBody;
    if (!body.content || typeof body.content !== "string") {
      return c.json({ error: "content required" }, 400);
    }
    if (!body.hostname) return c.json({ error: "hostname required" }, 400);
    if (!body.harness) return c.json({ error: "harness required" }, 400);
    if (!body.embedding_model || typeof body.embedding_model !== "string") {
      return c.json({ error: "embedding_model required" }, 400);
    }
    const embeddingModel = scrub(body.embedding_model).trim();
    if (!embeddingModel) {
      return c.json({ error: "embedding_model empty after scrub" }, 400);
    }

    const auth = currentAuth();
    const machineId =
      auth?.machineId ?? (typeof body.machine_id === "string" ? body.machine_id : "");
    if (!machineId) return c.json({ error: "machine_id required" }, 400);

    const cleaned = scrub(body.content).trim();
    if (!cleaned) return c.json({ error: "content empty after scrub" }, 400);

    const kind = body.kind && (KINDS as readonly string[]).includes(body.kind) ? body.kind : "note";
    const importance = Math.max(0.1, Math.min(1, body.importance ?? 1.0));
    const pinned = body.pinned ?? false;

    const cleanedRepo = body.repo ? scrub(body.repo) : null;
    const cleanedHostname = scrub(body.hostname);
    const cleanedHarness = scrub(body.harness);
    const cleanedAgent = body.agent ? scrub(body.agent) : null;
    const cleanedSessionId = body.session_id ? scrub(body.session_id) : null;
    const cleanedTopics = (body.topics ?? []).map(scrub);

    const contentHash = await sha256Hex(cleaned);
    const chunkId = await sha256Hex(`${contentHash}:${embeddingModel}`);
    const handoffSlug =
      typeof body.handoff_slug === "string" && body.handoff_slug.trim()
        ? scrub(body.handoff_slug).trim()
        : null;
    const meta: Record<string, unknown> = { pinned, source_slash: true };
    if (handoffSlug) meta.handoff_slug = handoffSlug;

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
            ${cleaned}, ${contentHash}, ${"manual:/api/memory"}, ${machineId}, ${cleanedHostname},
            ${cleanedRepo}, ${cleanedHarness}, ${cleanedAgent}, ${cleanedSessionId},
            ${cleanedTopics}, ${body.private ?? false}, ${sql.json({ direct_write: true } as never)}
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
            ${embeddingModel}, to_tsvector('english', ${cleaned}),
            ${kind}, ${importance},
            ${machineId}, ${cleanedRepo}, ${cleanedHarness}, ${cleanedAgent},
            ${cleanedTopics}, ${body.private ?? false},
            ${sql.json(meta as never)}
          )
          ON CONFLICT (chunk_id) DO UPDATE
          SET meta = memories.meta || ${sql.json(meta as never)},
              importance = GREATEST(memories.importance, EXCLUDED.importance)
          RETURNING id, (xmax = 0) AS created
        `;
      const memId = memRows[0]!.id;
      const created = memRows[0]!.created;
      // No embed enqueue: the legacy server-side embed worker was
      // retired in #29. This row is written with embedding=NULL and
      // can be re-extracted via /api/bundle from a daemon if a later
      // capture matches the content. Today this row is reachable
      // through keyword (tsv) and metadata queries even without an
      // embedding.
      return { id: memId, created };
    });

    Logger.info(result.created ? "memory created" : "memory updated", {
      id: result.id,
      kind,
      pinned,
      repo: cleanedRepo ?? "-",
      chars: cleaned.length,
    });
    return c.json({ id: result.id, created: result.created, pinned });
  });

  // ---------------------------------------------------------------------------
  // POST /api/ingest/spans — write, scope=capture
  // Daemons forward locally-emitted traces / spans / logs here. The
  // _ops.traces row is stamped with the caller's machine_id so per-machine
  // queries don't need to join through captures. Spans + logs FK to traces
  // (trace row inserted first within the same tx). Whole batch silently
  // skipped if any row would violate a FK; this is a best-effort firehose,
  // not a transactional contract.
  // ---------------------------------------------------------------------------
  app.post("/api/ingest/spans", silentTrace, requireAuth("capture"), async (c) => {
    const auth = currentAuth();
    if (!auth?.machineId) {
      return c.json({ error: "ingest/spans requires per-machine token" }, 400);
    }
    const body = (await c.req.json().catch(() => null)) as IngestSpansBody | null;
    if (!body) return c.json({ error: "invalid_json" }, 400);

    const traces = Array.isArray(body.traces) ? body.traces : [];
    const spans = Array.isArray(body.spans) ? body.spans : [];
    const logs = Array.isArray(body.logs) ? body.logs : [];

    if (
      traces.length > MAX_BATCH_TRACES ||
      spans.length > MAX_BATCH_SPANS ||
      logs.length > MAX_BATCH_LOGS
    ) {
      return c.json({ error: "batch too large" }, 413);
    }

    if (traces.length === 0 && spans.length === 0 && logs.length === 0) {
      return c.json({ ok: true, traces: 0, spans: 0, logs: 0 });
    }

    try {
      await sql.begin(async (tx) => {
        if (traces.length > 0) {
          await tx`
              INSERT INTO _ops.traces ${tx(
                traces.map((t) => ({
                  trace_id: t.traceId,
                  root_span_name: t.rootSpanName,
                  source: t.source,
                  started_at: new Date(t.startedAtMs),
                  ended_at: new Date(t.endedAtMs),
                  duration_ms: t.durationMs,
                  machine_id: auth.machineId,
                })),
              )}
              ON CONFLICT (trace_id) DO NOTHING
            `;
        }
        if (spans.length > 0) {
          await tx`
              INSERT INTO _ops.spans ${tx(
                spans.map((s) => {
                  const inputCol =
                    s.input === undefined || s.input === null
                      ? null
                      : tx.json(scrubData(s.input) as never);
                  const outputCol =
                    s.output === undefined || s.output === null
                      ? null
                      : tx.json(scrubData(s.output) as never);
                  return {
                    span_id: s.spanId,
                    trace_id: s.traceId,
                    parent_span_id: s.parentSpanId ?? null,
                    name: s.name,
                    started_at: new Date(s.startedAtMs),
                    duration_ms: s.durationMs ?? null,
                    error_message: s.errorMessage ?? null,
                    input_size: s.inputSize ?? null,
                    output_size: s.outputSize ?? null,
                    input: inputCol,
                    output: outputCol,
                  };
                }),
              )}
              ON CONFLICT (span_id) DO NOTHING
            `;
        }
        if (logs.length > 0) {
          await tx`
              INSERT INTO _ops.logs ${tx(
                logs.map((l) => ({
                  trace_id: l.traceId ?? null,
                  span_id: l.spanId ?? null,
                  level: l.level,
                  message: scrub(l.message),
                  ts: new Date(l.ts),
                })),
              )}
            `;
        }
      });
    } catch (err) {
      Logger.warn(`ingest/spans failed: ${err instanceof Error ? err.message : String(err)}`);
      return c.json({ error: "ingest_failed" }, 500);
    }

    return c.json({
      ok: true,
      traces: traces.length,
      spans: spans.length,
      logs: logs.length,
    });
  });
}
