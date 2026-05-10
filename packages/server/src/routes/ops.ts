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
import { inspectBreakers } from "../llm/pick.ts";

const HEARTBEAT_STALE_MS = 3 * 60 * 1000;
const DREAM_STUCK_AFTER_MS = 30 * 60 * 1000;

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
  stuck: number;
};

export function mountOpsRoutes(app: Hono): void {
  app.get(
    "/api/_ops/status",
    mnemeRoute("api._ops.status"),
    // Read scope (not admin): the status snapshot is operational
    // health, not a privileged action. Per-machine tokens can read it
    // so the dashboard + slash commands work without holding admin.
    requireAuth("read"),
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

      const [dreamRow] = (await sql`
        SELECT
          MAX(claimed_at) AS last_window_at,
          (
            SELECT cluster_count
            FROM _ops.dream_runs
            WHERE completed_at IS NOT NULL
            ORDER BY claimed_at DESC LIMIT 1
          ) AS last_cluster_count,
          COUNT(*) FILTER (WHERE completed_at IS NULL)::int AS in_flight,
          COUNT(*) FILTER (
            WHERE completed_at IS NULL
              AND claimed_at < now() - interval '30 minutes'
          )::int AS stuck
        FROM _ops.dream_runs
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
  app.get(
    "/api/_ops/logs",
    mnemeRoute("api._ops.logs"),
    requireAuth("read"),
    async (c) => {
      const url = new URL(c.req.url);
      const sinceParam = url.searchParams.get("since");
      const sinceParsed = sinceParam ? new Date(sinceParam) : null;
      const sinceTs =
        sinceParsed && !Number.isNaN(sinceParsed.getTime())
          ? sinceParsed
          : new Date(Date.now() - 5 * 60_000);
      const limitRaw = Number(url.searchParams.get("limit") ?? 200);
      const limit = Math.min(
        1000,
        Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 200),
      );
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
    },
  );
}
