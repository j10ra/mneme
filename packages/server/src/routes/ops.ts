// /api/_ops/status — operator health snapshot. Admin-only.
//
// One call returns enough to answer "is anything wedged?":
//   - workers[]   scheduler-driven jobs (nap, dream, keepalive) with
//                 last_run_at / last_status / last_duration_ms / next_run_at
//                 from _ops.worker_runs.
//   - daemons[]   per-machine outbox depths + last_processed_at from
//                 _ops.daemon_heartbeats, joined to the latest non-revoked
//                 api_keys row for a human label. Stale flag fires when
//                 posted_at is older than 3× the heartbeat interval.
//   - dream       latest claimed window + cluster_count, plus a count of
//                 in-flight claims (claimed_at without completed_at) older
//                 than the 30-min reap horizon — a non-zero "stuck" number
//                 means a leader crashed mid-cycle.
//   - breakers    in-process picker breaker state for local + openrouter.
//                 Fine to read here because the endpoint runs in the same
//                 process as pick.ts.

import { Hono } from "hono";
import { mnemeRoute, requireAuth } from "@mneme/core";
import { sql } from "../infra/db.ts";
import { EMBEDDER_DIM } from "../infra/config.ts";
import { inspectBreakers } from "../llm/pick.ts";

const HEARTBEAT_STALE_MS = 3 * 60 * 1000;
const DREAM_STUCK_AFTER_MS = 30 * 60 * 1000;

// Workers the dashboard may force-run. dream is excluded -- it runs on
// the daemon, not the server scheduler. keepalive / prune are not
// operator-facing.
const FORCEABLE_WORKERS = ["nap", "digest"] as const;

/** True when `name` is a server-scheduled worker the force endpoint
 *  will accept. Pure -- the route uses it to reject unknown names. */
export function isForceableWorker(name: string): boolean {
  return (FORCEABLE_WORKERS as readonly string[]).includes(name);
}

export type ForceRunResult =
  | { ok: true; job: string; next_run_at: Date }
  | { ok: false; status: 400 | 404; error: string };

/** Nudge a server-scheduled worker to run on the next scheduler tick.
 *  Sets next_run_at = now() and clears last_status / last_error so a
 *  prior failure is not left showing until the forced run completes.
 *  The scheduler's FOR UPDATE SKIP LOCKED claim guarantees the forced
 *  run never overlaps a concurrent scheduled cycle. */
export async function forceWorkerRun(name: string): Promise<ForceRunResult> {
  if (!isForceableWorker(name)) {
    return { ok: false, status: 400, error: "unknown worker" };
  }
  const rows = await sql<{ next_run_at: Date }[]>`
    UPDATE _ops.worker_runs
    SET next_run_at = now(), last_status = NULL, last_error = NULL
    WHERE job_name = ${name}
    RETURNING next_run_at
  `;
  if (rows.length === 0) {
    return { ok: false, status: 404, error: "worker not registered" };
  }
  return { ok: true, job: name, next_run_at: rows[0]!.next_run_at };
}

type WorkerRow = {
  job_name: string;
  schedule_ms: string | number;
  next_run_at: Date | string;
  last_run_at: Date | string | null;
  last_status: "ok" | "failed" | null;
  last_error: string | null;
  last_duration_ms: number | null;
};

type DaemonRow = {
  machine_id: string;
  machine_name: string | null;
  outbox_pending: number;
  outbox_extracted: number;
  outbox_embedded: number;
  outbox_failed: number;
  last_processed_at: Date | string | null;
  posted_at: Date | string;
};

type DreamRow = {
  last_window_at: Date | string | null;
  last_cluster_count: number | null;
  in_flight: number;
  ghost: number;
  stuck: number;
};

export function mountOpsRoutes(app: Hono): void {
  app.get(
    "/api/_ops/status",
    mnemeRoute("api._ops.status"),
    // Read scope (not admin): the status snapshot is operational
    // health, not a privileged action. Per-machine tokens can read it
    // so the dashboard + slash commands work without holding admin.
    requireAuth("admin"),
    async (c) => {
      const now = Date.now();

      const workerRows = (await sql`
        SELECT job_name, schedule_ms, next_run_at, last_run_at,
               last_status, last_error, last_duration_ms
        FROM _ops.worker_runs
        ORDER BY job_name
      `) as unknown as WorkerRow[];

      // Latest non-revoked api_key row per machine_id for a stable label.
      // The machines view returns multiple rows per machine when the token
      // has rotated, so we DISTINCT ON to keep one.
      const daemonRows = (await sql`
        WITH latest AS (
          SELECT DISTINCT ON (machine_id) machine_id, name
          FROM _ops.api_keys
          WHERE machine_id IS NOT NULL AND revoked_at IS NULL
          ORDER BY machine_id, last_used_at DESC NULLS LAST, created_at DESC
        )
        SELECT
          h.machine_id::text AS machine_id,
          latest.name AS machine_name,
          h.outbox_pending, h.outbox_extracted, h.outbox_embedded, h.outbox_failed,
          h.last_processed_at, h.posted_at
        FROM _ops.daemon_heartbeats h
        LEFT JOIN latest ON latest.machine_id = h.machine_id::text
        ORDER BY h.posted_at DESC
      `) as unknown as DaemonRow[];

      // in_flight only counts claims whose owning daemon is still
      // heartbeating. A claim from a daemon that died (SIGKILL during
      // refresh, crash, machine offline) is a "ghost" — the cycle isn't
      // actually running but the row sits there with completed_at = null
      // until the next acquireDreamLock reaps it. Splitting these means
      // the dashboard can render "RUNNING" only when something really is.
      const [dreamRow] = (await sql`
        SELECT
          MAX(dr.claimed_at) AS last_window_at,
          (
            SELECT cluster_count
            FROM _ops.dream_runs
            WHERE completed_at IS NOT NULL
            ORDER BY claimed_at DESC LIMIT 1
          ) AS last_cluster_count,
          COUNT(*) FILTER (
            WHERE dr.completed_at IS NULL
              AND h.posted_at IS NOT NULL
              AND h.posted_at > now() - (${HEARTBEAT_STALE_MS}::bigint || ' milliseconds')::interval
          )::int AS in_flight,
          COUNT(*) FILTER (
            WHERE dr.completed_at IS NULL
              AND (h.posted_at IS NULL
                   OR h.posted_at <= now() - (${HEARTBEAT_STALE_MS}::bigint || ' milliseconds')::interval)
          )::int AS ghost,
          COUNT(*) FILTER (
            WHERE dr.completed_at IS NULL
              AND dr.claimed_at < now() - interval '30 minutes'
              AND h.posted_at IS NOT NULL
              AND h.posted_at > now() - (${HEARTBEAT_STALE_MS}::bigint || ' milliseconds')::interval
          )::int AS stuck
        FROM _ops.dream_runs dr
        LEFT JOIN _ops.daemon_heartbeats h
          ON h.machine_id::text = dr.claimed_by_machine_id::text
      `) as unknown as DreamRow[];

      return c.json({
        generated_at: new Date(now).toISOString(),
        workers: workerRows.map((r) => {
          const lastRunMs = r.last_run_at ? new Date(r.last_run_at).getTime() : null;
          const nextRunMs = new Date(r.next_run_at).getTime();
          return {
            name: r.job_name,
            schedule_ms: Number(r.schedule_ms),
            last_run_at: r.last_run_at,
            last_status: r.last_status,
            last_error: r.last_error,
            last_duration_ms: r.last_duration_ms,
            next_run_at: r.next_run_at,
            overdue_ms: Math.max(0, now - nextRunMs),
            since_last_run_ms: lastRunMs !== null ? now - lastRunMs : null,
          };
        }),
        daemons: daemonRows.map((r) => {
          const postedMs = new Date(r.posted_at).getTime();
          return {
            machine_id: r.machine_id,
            machine_name: r.machine_name,
            outbox_pending: r.outbox_pending,
            outbox_extracted: r.outbox_extracted,
            outbox_embedded: r.outbox_embedded,
            outbox_failed: r.outbox_failed,
            last_processed_at: r.last_processed_at,
            posted_at: r.posted_at,
            stale: now - postedMs > HEARTBEAT_STALE_MS,
            since_posted_ms: now - postedMs,
          };
        }),
        dream: {
          last_window_at: dreamRow?.last_window_at ?? null,
          last_cluster_count: dreamRow?.last_cluster_count ?? null,
          in_flight: dreamRow?.in_flight ?? 0,
          ghost: dreamRow?.ghost ?? 0,
          stuck: dreamRow?.stuck ?? 0,
          stuck_after_ms: DREAM_STUCK_AFTER_MS,
        },
        breakers: inspectBreakers(),
      });
    },
  );

  // -------------------------------------------------------------------
  // GET /api/_ops/logs — recent server-side log rows from _ops.logs,
  // joined to _ops.traces for the originating machine_id and to
  // _ops.api_keys for a friendly machine_name. Optional join to
  // _ops.spans for span_name when the log is span-scoped.
  //
  // Query params:
  //   since   ISO-8601 timestamp; only rows with l.ts > since are returned.
  //           Defaults to now() - 5 minutes.
  //   level   log level filter; repeatable. Default: all.
  //   limit   max rows; default 200, capped at 1000.
  //
  // Returns rows in DESC ts order so the dashboard can render newest-
  // first and (when polling) prepend new entries.
  // -------------------------------------------------------------------
  app.get("/api/_ops/logs", mnemeRoute("api._ops.logs"), requireAuth("admin"), async (c) => {
    const url = new URL(c.req.url);
    const sinceParam = url.searchParams.get("since");
    const sinceParsed = sinceParam ? new Date(sinceParam) : null;
    const sinceTs =
      sinceParsed && !Number.isNaN(sinceParsed.getTime())
        ? sinceParsed
        : new Date(Date.now() - 5 * 60_000);
    const limitRaw = Number(url.searchParams.get("limit") ?? 200);
    const limit = Math.min(1000, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 200));
    const levels = url.searchParams.getAll("level").filter(Boolean);

    const rows = (await sql<
      {
        id: string;
        ts: Date | string;
        level: string;
        message: string;
        trace_id: string | null;
        span_id: string | null;
        machine_id: string | null;
        machine_name: string | null;
        span_name: string | null;
      }[]
    >`
        SELECT
          l.id::text       AS id,
          l.ts,
          l.level,
          l.message,
          l.trace_id::text AS trace_id,
          l.span_id::text  AS span_id,
          t.machine_id::text AS machine_id,
          k.name           AS machine_name,
          s.name           AS span_name
        FROM _ops.logs l
        LEFT JOIN _ops.traces t ON t.trace_id = l.trace_id
        LEFT JOIN _ops.spans  s ON s.span_id  = l.span_id
        LEFT JOIN LATERAL (
          SELECT name
          FROM _ops.api_keys
          WHERE machine_id = t.machine_id::text
            AND revoked_at IS NULL
          ORDER BY last_used_at DESC NULLS LAST, created_at DESC
          LIMIT 1
        ) k ON TRUE
        WHERE l.ts > ${sinceTs}
          ${levels.length > 0 ? sql`AND l.level = ANY(${levels})` : sql``}
        ORDER BY l.ts DESC
        LIMIT ${limit}
      `) as unknown as Array<{
      id: string;
      ts: Date | string;
      level: string;
      message: string;
      trace_id: string | null;
      span_id: string | null;
      machine_id: string | null;
      machine_name: string | null;
      span_name: string | null;
    }>;

    return c.json({ logs: rows });
  });

  // -------------------------------------------------------------------
  // GET /api/_ops/memories — paginated memory browse + hybrid search
  // for the dashboard's Memories panel.
  //
  // Filters (all optional, all comma-sep multi where applicable):
  //   since, until    ISO timestamps; default (now-7d, now)
  //   repo            comma-sep
  //   machine_id      comma-sep (text, joins to _ops.api_keys for name)
  //   kind            comma-sep (memories.kind taxonomy)
  //   cluster_status  in_cluster | orphaned | superseded | shadow
  //   qvec            comma-separated EMBEDDER_DIM floats, pre-embedded
  //                   by the caller (the per-machine daemon's bge-small
  //                   subprocess for the dashboard search path)
  //   qkw             keyword text for ts_rank, sent alongside qvec
  //   limit, offset   default 50, max 200
  // -------------------------------------------------------------------
  app.get(
    "/api/_ops/memories",
    mnemeRoute("api._ops.memories"),
    requireAuth("admin"),
    async (c) => {
      const u = new URL(c.req.url);
      const since = parseTs(u.searchParams.get("since"), new Date(Date.now() - 7 * 86_400_000));
      const until = parseTs(u.searchParams.get("until"), new Date());
      const repos = csv(u.searchParams.get("repo"));
      const machineIds = csv(u.searchParams.get("machine_id"));
      const kinds = csv(u.searchParams.get("kind"));
      const clusterStatus = csv(u.searchParams.get("cluster_status"));
      const qvecRaw = (u.searchParams.get("qvec") ?? "").trim();
      const qkw = (u.searchParams.get("qkw") ?? "").trim();
      const limit = clamp(Number(u.searchParams.get("limit") ?? 50), 1, 200, 50);
      const offset = clamp(Number(u.searchParams.get("offset") ?? 0), 0, 100_000, 0);

      // Parse qvec (caller pre-embedded the search text). Reject early on
      // malformed input rather than passing a bad literal to Postgres.
      let vecLit: string | null = null;
      if (qvecRaw) {
        const parts = qvecRaw.split(",");
        if (parts.length !== EMBEDDER_DIM) {
          return c.json(
            { error: `qvec must be ${EMBEDDER_DIM} comma-separated floats, got ${parts.length}` },
            400,
          );
        }
        for (const p of parts) {
          if (!Number.isFinite(Number(p))) {
            return c.json({ error: "qvec contains non-numeric values" }, 400);
          }
        }
        vecLit = `[${parts.join(",")}]`;
      }

      // Build filter clauses lazily so we can splice them either into
      // the plain-filter query or the hybrid-scoring query.
      const filters = sql`
        m.created_at >= ${since}
        AND m.created_at < ${until}
        ${repos.length > 0 ? sql`AND m.repo = ANY(${repos})` : sql``}
        ${machineIds.length > 0 ? sql`AND m.machine_id = ANY(${machineIds})` : sql``}
        ${kinds.length > 0 ? sql`AND m.kind = ANY(${kinds})` : sql``}
        ${clusterStatusClause(clusterStatus)}
      `;

      let rows: MemoryRow[];
      if (vecLit) {
        rows = (await sql<MemoryRow[]>`
          WITH q_vec AS (SELECT ${vecLit}::vector AS v),
               q_kw  AS (SELECT websearch_to_tsquery('simple', ${qkw || ""}) AS q)
          SELECT
            m.id::text                 AS id,
            m.content,
            m.kind,
            m.repo,
            m.machine_id,
            m.importance,
            m.created_at,
            m.meta->>'in_cluster'      AS cluster_id,
            (m.meta ? 'superseded_by') AS superseded,
            k.name                     AS machine_name,
            (0.6 * (1 - (m.embedding <=> (SELECT v FROM q_vec))) +
             0.4 * COALESCE(ts_rank(m.tsv, (SELECT q FROM q_kw)), 0)) AS score
          FROM memories m
          LEFT JOIN LATERAL (
            SELECT name FROM _ops.api_keys
            WHERE machine_id = m.machine_id AND revoked_at IS NULL
            ORDER BY last_used_at DESC NULLS LAST, created_at DESC
            LIMIT 1
          ) k ON TRUE
          WHERE ${filters}
            AND m.archived_at IS NULL
          ORDER BY score DESC, m.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `) as unknown as MemoryRow[];
      } else {
        rows = (await sql<MemoryRow[]>`
          SELECT
            m.id::text                 AS id,
            m.content,
            m.kind,
            m.repo,
            m.machine_id,
            m.importance,
            m.created_at,
            m.meta->>'in_cluster'      AS cluster_id,
            (m.meta ? 'superseded_by') AS superseded,
            k.name                     AS machine_name,
            NULL::float                AS score
          FROM memories m
          LEFT JOIN LATERAL (
            SELECT name FROM _ops.api_keys
            WHERE machine_id = m.machine_id AND revoked_at IS NULL
            ORDER BY last_used_at DESC NULLS LAST, created_at DESC
            LIMIT 1
          ) k ON TRUE
          WHERE ${filters}
            AND m.archived_at IS NULL
          ORDER BY m.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `) as unknown as MemoryRow[];
      }

      return c.json({ memories: rows });
    },
  );

  // -------------------------------------------------------------------
  // GET /api/_ops/memories/:id/related — top-k vector neighbors of a
  // memory by cosine distance. Used for the "Related" expand tab.
  // -------------------------------------------------------------------
  app.get(
    "/api/_ops/memories/:id/related",
    mnemeRoute("api._ops.memories.related"),
    requireAuth("admin"),
    async (c) => {
      const id = c.req.param("id");
      const k = clamp(Number(c.req.query("k") ?? 6), 1, 20, 6);
      // Direct-write memories (e.g. /mneme:pin <text>, /mneme:handoff)
      // land with embedding=NULL until the daemon picks them up. Without
      // a seed vector `m.embedding <=> NULL` returns NULL for every row,
      // producing a related list of NULL distances that the dashboard
      // can't render. Short-circuit with empty instead.
      const [seedRow] = await sql<{ has_embedding: boolean }[]>`
        SELECT embedding IS NOT NULL AS has_embedding
        FROM memories
        WHERE id = ${id}::uuid AND archived_at IS NULL
      `;
      if (!seedRow?.has_embedding) {
        return c.json({ related: [] });
      }
      const rows = (await sql<
        { id: string; content_preview: string; distance: number; kind: string | null }[]
      >`
        WITH seed AS (
          SELECT embedding FROM memories WHERE id = ${id}::uuid AND archived_at IS NULL
        )
        SELECT
          m.id::text                            AS id,
          left(m.content, 200)                  AS content_preview,
          (m.embedding <=> (SELECT embedding FROM seed))::float AS distance,
          m.kind                                AS kind
        FROM memories m, seed
        WHERE m.id <> ${id}::uuid
          AND m.archived_at IS NULL
          AND m.embedding IS NOT NULL
        ORDER BY m.embedding <=> seed.embedding
        LIMIT ${k}
      `) as unknown as Array<{
        id: string;
        content_preview: string;
        distance: number;
        kind: string | null;
      }>;
      return c.json({ related: rows });
    },
  );

  // -------------------------------------------------------------------
  // GET /api/_ops/memories/:id/supersede-chain — walks parents (what
  // this memory replaced) and children (what replaced this memory) up
  // to a small bounded depth so a long chain doesn't explode the
  // response.
  // -------------------------------------------------------------------
  app.get(
    "/api/_ops/memories/:id/supersede-chain",
    mnemeRoute("api._ops.memories.supersede_chain"),
    requireAuth("admin"),
    async (c) => {
      const id = c.req.param("id");
      const MAX_DEPTH = 8;
      // Parents: this memory's superseded_by points to its replacement.
      // Walk backwards via meta->>'superseded_by'.
      const parents = (await sql<
        { id: string; content_preview: string; kind: string | null; depth: number }[]
      >`
        WITH RECURSIVE chain AS (
          SELECT m.id, m.content, m.kind, m.meta, 0 AS depth
          FROM memories m WHERE m.id = ${id}::uuid
          UNION ALL
          SELECT p.id, p.content, p.kind, p.meta, chain.depth + 1
          FROM memories p
          JOIN chain ON p.id::text = chain.meta->>'superseded_by'
          WHERE chain.depth < ${MAX_DEPTH}
        )
        SELECT id::text, left(content, 200) AS content_preview, kind, depth
        FROM chain WHERE depth > 0
        ORDER BY depth ASC
      `) as unknown as Array<{
        id: string;
        content_preview: string;
        kind: string | null;
        depth: number;
      }>;
      // Children: memories whose superseded_by points back at this one,
      // recursively.
      const children = (await sql<
        { id: string; content_preview: string; kind: string | null; depth: number }[]
      >`
        WITH RECURSIVE chain AS (
          SELECT m.id, m.content, m.kind, m.meta, 0 AS depth
          FROM memories m WHERE m.id = ${id}::uuid
          UNION ALL
          SELECT c.id, c.content, c.kind, c.meta, chain.depth + 1
          FROM memories c
          JOIN chain ON c.meta->>'superseded_by' = chain.id::text
          WHERE chain.depth < ${MAX_DEPTH}
        )
        SELECT id::text, left(content, 200) AS content_preview, kind, depth
        FROM chain WHERE depth > 0
        ORDER BY depth ASC
      `) as unknown as Array<{
        id: string;
        content_preview: string;
        kind: string | null;
        depth: number;
      }>;
      return c.json({ parents, children });
    },
  );

  // -------------------------------------------------------------------
  // GET /api/_ops/memories/:id/capture — the raw capture body that
  // produced this memory. Used by the "Cluster + capture" expand tab.
  // -------------------------------------------------------------------
  app.get(
    "/api/_ops/memories/:id/capture",
    mnemeRoute("api._ops.memories.capture"),
    requireAuth("admin"),
    async (c) => {
      const id = c.req.param("id");
      const rows = (await sql<
        {
          id: string;
          content: string;
          source: string;
          repo: string | null;
          captured_at: Date | string;
          raw_meta: unknown;
        }[]
      >`
        SELECT
          c.id::text                  AS id,
          c.content,
          c.source,
          c.repo,
          c.captured_at,
          c.raw_meta
        FROM captures c
        WHERE c.id = (SELECT capture_id FROM memories WHERE id = ${id}::uuid)
        LIMIT 1
      `) as unknown as Array<{
        id: string;
        content: string;
        source: string;
        repo: string | null;
        captured_at: Date | string;
        raw_meta: unknown;
      }>;
      const row = rows[0];
      if (!row) return c.json({ error: "capture not found" }, 404);
      return c.json({ capture: row });
    },
  );

  // -------------------------------------------------------------------
  // GET /api/_ops/memories/:id — the full memory row (every column except
  // the embedding vector + tsv), for the detail drawer's "all fields" view.
  // Content is already scrubbed at ingest, and _ops is admin-only.
  // -------------------------------------------------------------------
  app.get(
    "/api/_ops/memories/:id",
    mnemeRoute("api._ops.memories.get"),
    requireAuth("admin"),
    async (c) => {
      const id = c.req.param("id");
      const rows = (await sql<Array<Record<string, unknown>>>`
        SELECT
          m.id::text          AS id,
          m.capture_id::text  AS capture_id,
          m.chunk_id,
          m.content,
          m.content_hash,
          m.embedding_model,
          m.kind,
          m.importance,
          m.recall_weight,
          m.machine_id,
          k.name              AS machine_name,
          m.repo,
          m.harness,
          m.agent,
          m.topics,
          m.private,
          m.meta,
          m.created_at,
          m.archived_at
        FROM memories m
        LEFT JOIN LATERAL (
          SELECT name FROM _ops.api_keys
          WHERE machine_id = m.machine_id AND revoked_at IS NULL
          ORDER BY last_used_at DESC NULLS LAST, created_at DESC
          LIMIT 1
        ) k ON TRUE
        WHERE m.id = ${id}::uuid
        LIMIT 1
      `) as unknown as Array<Record<string, unknown>>;
      const row = rows[0];
      if (!row) return c.json({ error: "memory not found" }, 404);
      return c.json({ memory: row });
    },
  );

  // -------------------------------------------------------------------
  // GET /api/_ops/clusters — cluster summaries derived from
  // memories.meta->>'in_cluster'. There's no _ops.clusters table; the
  // cluster_id IS itself a memory id (the "theme" memory acting as
  // centroid), so we self-join to get its content as the summary.
  // -------------------------------------------------------------------
  app.get(
    "/api/_ops/clusters",
    mnemeRoute("api._ops.clusters"),
    requireAuth("admin"),
    async (c) => {
      const u = new URL(c.req.url);
      const since = parseTs(u.searchParams.get("since"), new Date(Date.now() - 30 * 86_400_000));
      const until = parseTs(u.searchParams.get("until"), new Date());
      const limit = clamp(Number(u.searchParams.get("limit") ?? 50), 1, 200, 50);
      const rows = (await sql<
        {
          id: string;
          summary: string | null;
          member_count: number;
          last_at: Date | string;
          sample_machine_ids: string[];
        }[]
      >`
        WITH grouped AS (
          SELECT
            (meta->>'in_cluster')::uuid AS cluster_id,
            count(*)                    AS members,
            max(created_at)             AS last_at,
            (array_agg(DISTINCT machine_id))[1:5] AS machines
          FROM memories
          WHERE meta ? 'in_cluster'
            AND archived_at IS NULL
            AND created_at >= ${since}
            AND created_at < ${until}
          GROUP BY 1
        )
        SELECT
          g.cluster_id::text     AS id,
          left(t.content, 240)   AS summary,
          g.members::int         AS member_count,
          g.last_at              AS last_at,
          g.machines             AS sample_machine_ids
        FROM grouped g
        LEFT JOIN memories t ON t.id = g.cluster_id
        ORDER BY g.last_at DESC
        LIMIT ${limit}
      `) as unknown as Array<{
        id: string;
        summary: string | null;
        member_count: number;
        last_at: Date | string;
        sample_machine_ids: string[];
      }>;
      return c.json({ clusters: rows });
    },
  );

  // -------------------------------------------------------------------
  // GET /api/_ops/graph — top-N most-connected memories + their edges
  // for the dashboard's Graph view. One round trip; sub-second target.
  //
  // Filters mirror /api/_ops/memories (since/until/repo/machine_id/kind).
  // Ranking: importance DESC, ties broken by edge_count (related_to
  // count + supersede), then recency. Importance-first surfaces the
  // memories the user actually cares about; edge_count alone would be
  // dominated by the subset nap has finished relating.
  //
  // Edges are filtered to only those whose endpoints both made the
  // top-N cut, so the graph stays self-contained.
  // -------------------------------------------------------------------
  app.get("/api/_ops/graph", mnemeRoute("api._ops.graph"), requireAuth("admin"), async (c) => {
    const u = new URL(c.req.url);
    const since = parseTs(u.searchParams.get("since"), new Date(Date.now() - 30 * 86_400_000));
    const until = parseTs(u.searchParams.get("until"), new Date());
    const repos = csv(u.searchParams.get("repo"));
    const machineIds = csv(u.searchParams.get("machine_id"));
    const kinds = csv(u.searchParams.get("kind"));
    const topN = clamp(Number(u.searchParams.get("top_n") ?? 300), 1, 1000, 300);
    const focal = u.searchParams.get("focal");
    const hops = clamp(Number(u.searchParams.get("hops") ?? 1), 0, 6, 1);

    const filters = sql`
        m.created_at >= ${since}
        AND m.created_at < ${until}
        ${repos.length > 0 ? sql`AND m.repo = ANY(${repos})` : sql``}
        ${machineIds.length > 0 ? sql`AND m.machine_id = ANY(${machineIds})` : sql``}
        ${kinds.length > 0 ? sql`AND m.kind = ANY(${kinds})` : sql``}
      `;

    // Two modes:
    //   - focal set: BFS from focal up to `hops` levels within the
    //                filter pool. Returns nodes with their depth.
    //   - else:      ranked top-N by importance (then edge_count).
    let ids: string[];
    let depthByNode: Map<string, number> | null = null;
    if (focal) {
      const bfsRows = (await sql<Array<{ id: string; depth: number }>>`
          WITH RECURSIVE candidates AS (
            SELECT m.id, m.meta
            FROM memories m
            WHERE ${filters}
              AND m.archived_at IS NULL
          ),
          bfs(id, depth) AS (
            SELECT c.id::text, 0
            FROM candidates c
            WHERE c.id = ${focal}::uuid
            UNION
            SELECT (rel.value)::text, b.depth + 1
            FROM bfs b
            JOIN candidates c ON c.id::text = b.id
            CROSS JOIN LATERAL jsonb_array_elements_text(c.meta->'related_to') AS rel(value)
            WHERE b.depth < ${hops}
              AND EXISTS (
                SELECT 1 FROM candidates c2
                WHERE c2.id::text = rel.value
              )
          )
          SELECT id, MIN(depth)::int AS depth
          FROM bfs
          GROUP BY id
        `) as unknown as Array<{ id: string; depth: number }>;
      ids = bfsRows.map((r) => r.id);
      depthByNode = new Map(bfsRows.map((r) => [r.id, r.depth]));
    } else {
      const ranked = (await sql<Array<{ id: string }>>`
          WITH candidates AS (
            SELECT
              m.id,
              m.kind,
              m.importance,
              m.machine_id,
              m.meta,
              m.content,
              m.created_at,
              COALESCE(jsonb_array_length(m.meta->'related_to'), 0)
                + (CASE WHEN m.meta ? 'superseded_by' THEN 1 ELSE 0 END)
                AS edge_count
            FROM memories m
            WHERE ${filters}
          )
          SELECT id::text AS id
          FROM candidates
          ORDER BY importance DESC NULLS LAST, edge_count DESC, created_at DESC
          LIMIT ${topN}
        `) as unknown as Array<{ id: string }>;
      ids = ranked.map((r) => r.id);
    }
    if (ids.length === 0) {
      return c.json({
        nodes: [],
        edges: [],
        stats: { node_count: 0, edge_count: 0, total_in_window: 0 },
      });
    }

    const nodes = (await sql<Array<GraphNode>>`
        SELECT
          m.id::text                  AS id,
          left(m.content, 200)        AS content_preview,
          m.kind                      AS kind,
          m.importance                AS importance,
          m.meta->>'in_cluster'       AS cluster_id,
          (m.meta ? 'superseded_by')  AS superseded,
          m.machine_id                AS machine_id,
          k.name                      AS machine_name,
          m.created_at                AS created_at,
          m.recall_weight             AS recall_weight,
          (m.archived_at IS NOT NULL) AS archived
        FROM memories m
        LEFT JOIN LATERAL (
          SELECT name FROM _ops.api_keys
          WHERE machine_id = m.machine_id AND revoked_at IS NULL
          ORDER BY last_used_at DESC NULLS LAST, created_at DESC
          LIMIT 1
        ) k ON TRUE
        WHERE m.id = ANY(${ids}::uuid[])
      `) as unknown as Array<GraphNode>;
    // Stamp BFS depth onto nodes when focal mode.
    if (depthByNode) {
      for (const n of nodes) {
        n.depth = depthByNode.get(n.id) ?? null;
      }
    }

    // Step 3: edges — related_to (unnested) + supersede, both
    //         constrained to the top-N set.
    const idSet = new Set(ids);
    const relatedRows = (await sql<Array<{ source: string; target: string }>>`
        SELECT
          m.id::text  AS source,
          (rel)::text AS target
        FROM memories m,
             jsonb_array_elements_text(m.meta->'related_to') AS rel
        WHERE m.id = ANY(${ids}::uuid[])
      `) as unknown as Array<{ source: string; target: string }>;
    const supersedeRows = (await sql<Array<{ source: string; target: string }>>`
        SELECT
          m.id::text                          AS source,
          (m.meta->>'superseded_by')          AS target
        FROM memories m
        WHERE m.id = ANY(${ids}::uuid[])
          AND m.meta ? 'superseded_by'
      `) as unknown as Array<{ source: string; target: string }>;

    const edges: Array<GraphEdge> = [];
    for (const r of relatedRows) {
      if (idSet.has(r.target)) {
        edges.push({ source: r.source, target: r.target, type: "related" });
      }
    }
    for (const r of supersedeRows) {
      if (idSet.has(r.target)) {
        edges.push({ source: r.source, target: r.target, type: "supersede" });
      }
    }

    const totalRows = (await sql<Array<{ total: number }>>`
        SELECT count(*)::int AS total
        FROM memories m
        WHERE ${filters}
      `) as unknown as Array<{ total: number }>;

    return c.json({
      nodes,
      edges,
      stats: {
        node_count: nodes.length,
        edge_count: edges.length,
        total_in_window: totalRows[0]?.total ?? 0,
      },
    });
  });

  app.post(
    "/api/_ops/worker/:name/run",
    mnemeRoute("api._ops.worker.run"),
    requireAuth("admin"),
    async (c) => {
      const r = await forceWorkerRun(c.req.param("name"));
      if (!r.ok) return c.json({ error: r.error }, r.status);
      return c.json({ queued: true, job: r.job, next_run_at: r.next_run_at });
    },
  );
}

type GraphNode = {
  id: string;
  content_preview: string;
  kind: string | null;
  importance: number | null;
  cluster_id: string | null;
  superseded: boolean;
  machine_id: string | null;
  machine_name: string | null;
  /** ISO timestamp — drives the timeline X position (oldest left, newest right). */
  created_at: string;
  /** Activity signal — drives node brightness (most-recalled = brightest). */
  recall_weight: number | null;
  /** True when archived_at is set — rendered dimmest ("the archive"). */
  archived: boolean;
  depth?: number | null;
};
type GraphEdge = {
  source: string;
  target: string;
  type: "related" | "supersede";
};

// ── Helpers ─────────────────────────────────────────────────────────

type MemoryRow = {
  id: string;
  content: string;
  kind: string | null;
  repo: string | null;
  machine_id: string | null;
  machine_name: string | null;
  importance: number | null;
  created_at: Date | string;
  cluster_id: string | null;
  superseded: boolean;
  score: number | null;
};

function parseTs(raw: string | null, fallback: Date): Date {
  if (!raw) return fallback;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function csv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clamp(n: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

/** Translate cluster_status filter values into a SQL fragment. Multiple
 *  values OR together. Empty list = no filter. */
function clusterStatusClause(values: string[]): ReturnType<typeof sql> {
  if (values.length === 0) return sql``;
  const fragments = values.map((v) => {
    switch (v) {
      case "in_cluster":
        return sql`(m.meta ? 'in_cluster' AND NOT (m.meta ? 'superseded_by'))`;
      case "orphaned":
        return sql`(NOT (m.meta ? 'in_cluster') AND NOT (m.meta ? 'superseded_by') AND NOT (m.meta ? 'shadow_marked_at'))`;
      case "superseded":
        return sql`(m.meta ? 'superseded_by')`;
      case "shadow":
        return sql`(m.meta ? 'shadow_marked_at')`;
      default:
        return sql`FALSE`;
    }
  });
  // Compose with OR using sql.unsafe? Postgres.js doesn't have a clean
  // OR-join, so we reduce by manually wrapping in (frag1 OR frag2 ...)
  // by using sql with array spread is unsupported. Build a recursive
  // chain instead.
  let combined = fragments[0]!;
  for (let i = 1; i < fragments.length; i++) {
    combined = sql`${combined} OR ${fragments[i]!}`;
  }
  return sql`AND (${combined})`;
}
