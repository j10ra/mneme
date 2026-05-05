// Centralized scheduler for time-driven workers (nap, keepalive, dream).
// Persists next_run_at to _ops.worker_runs so Railway redeploys don't skip
// cycles. Queue-driven workers (extract, embed) keep their tight polling
// loops and are NOT registered here.
//
// Pattern:
//   register({ name: "nap", scheduleMs: 6 * 3600_000, run: runNapOnce })
//   startScheduler()  // single setInterval ticking every 60s

import { Logger } from "@mneme/core";
import { sql } from "../db.ts";

const TICK_MS = 60_000;

type RegisteredJob = {
  name: string;
  scheduleMs: number;
  run: () => Promise<unknown>;
};

const registry = new Map<string, RegisteredJob>();

const SINGLETON_KEY = Symbol.for("mneme.scheduler.singleton");
type State = { stopped: boolean; timer: ReturnType<typeof setInterval> | null };
const g = globalThis as unknown as { [key: symbol]: State | undefined };

if (g[SINGLETON_KEY]) {
  g[SINGLETON_KEY].stopped = true;
  if (g[SINGLETON_KEY].timer) clearInterval(g[SINGLETON_KEY].timer);
}
const state: State = { stopped: false, timer: null };
g[SINGLETON_KEY] = state;

/** Register a time-driven job. Idempotent on (name): re-registering with a
 *  different scheduleMs updates the row but doesn't reset next_run_at —
 *  schedule changes apply from the next run forward. */
export function register(job: RegisteredJob): void {
  registry.set(job.name, job);
}

/** Persist registry → _ops.worker_runs. Inserts new rows with next_run_at=now()
 *  so a fresh deploy fires every job once shortly after startup. Existing rows
 *  keep their next_run_at — restarts don't reset the schedule. */
async function syncRegistry(): Promise<void> {
  for (const job of registry.values()) {
    await sql`
      INSERT INTO _ops.worker_runs (job_name, schedule_ms, next_run_at)
      VALUES (${job.name}, ${job.scheduleMs}, now())
      ON CONFLICT (job_name) DO UPDATE
      SET schedule_ms = EXCLUDED.schedule_ms
    `;
  }
}

async function tick(): Promise<void> {
  if (state.stopped) return;

  // Claim due jobs by advancing `next_run_at` inside the locking transaction.
  // The lock from FOR UPDATE SKIP LOCKED only persists during this select; if
  // we ran the job afterwards and updated next_run_at on completion, a long
  // job (e.g. dream during a 2-minute LLM call) would still be due on the
  // next 60s tick and re-fire. Advancing the schedule first means a hung or
  // slow job is invisible to subsequent ticks until at least scheduleMs has
  // elapsed since claim time. On crash the transaction rolls back so the
  // job is eligible again on the next tick — preserving the prior retry
  // behavior. The post-run UPDATE only writes last_* metadata; it never
  // re-touches next_run_at.
  const claimed = await sql.begin(async (tx) => {
    const due = await tx<{ job_name: string; schedule_ms: number }[]>`
      SELECT job_name, schedule_ms FROM _ops.worker_runs
      WHERE next_run_at <= now()
      ORDER BY next_run_at ASC
      LIMIT 5
      FOR UPDATE SKIP LOCKED
    `;
    if (due.length === 0) return [] as { job_name: string }[];
    await tx`
      UPDATE _ops.worker_runs
      SET next_run_at = now() + (schedule_ms || ' milliseconds')::interval
      WHERE job_name = ANY(${due.map((d) => d.job_name)})
    `;
    return due;
  });

  for (const { job_name } of claimed) {
    const job = registry.get(job_name);
    if (!job) {
      // Row exists in DB but no in-process registration. Could be a job
      // we removed or a future job another worker handles. Skip.
      continue;
    }

    const t0 = Date.now();
    let status: "ok" | "failed" = "ok";
    let errorMsg: string | null = null;
    try {
      await job.run();
    } catch (e) {
      status = "failed";
      errorMsg = e instanceof Error ? e.message : String(e);
      Logger.error("scheduler: job failed", e, { job: job.name });
    }
    const elapsed = Date.now() - t0;

    await sql`
      UPDATE _ops.worker_runs
      SET last_run_at = now(),
          last_status = ${status},
          last_error = ${errorMsg},
          last_duration_ms = ${elapsed}
      WHERE job_name = ${job.name}
    `;

    if (status === "ok") {
      Logger.info("scheduler: job ok", {
        job: job.name,
        elapsed_s: Number((elapsed / 1000).toFixed(1)),
      });
    }
  }
}

/** Start the scheduler. Persists registered jobs, then ticks every TICK_MS. */
export async function startScheduler(): Promise<void> {
  const names = [...registry.keys()];
  Logger.info("scheduler: starting", {
    jobs: names,
    tick_s: TICK_MS / 1000,
  });
  try {
    await syncRegistry();
  } catch (e) {
    Logger.error("scheduler: registry sync failed (will retry on next tick)", e);
  }
  // Recover stale claims. The "advance next_run_at inside the locking tx"
  // pattern stops long jobs from re-firing on subsequent ticks, but if the
  // process dies between commit-of-claim and the post-run UPDATE, the job
  // is stuck waiting a full schedule_ms before the next tick re-eligibles
  // it (24h for dream). At startup, two paths:
  //   (a) last_run_at NOT NULL: prior cycles ran cleanly, but this cycle's
  //       last_run_at lags next_run_at by more than one full schedule —
  //       claim happened, completion never recorded.
  //   (b) last_run_at IS NULL: the row has never recorded a successful run.
  //       A fresh sync sets next_run_at = now(), so a NULL row with
  //       next_run_at far in the future means the very first claim
  //       crashed before completing. The 5-minute slack is wider than a
  //       tick interval (60s) so we don't false-positive on a row that
  //       just got synced.
  // Both cases reset next_run_at to now() so the first tick after boot
  // re-runs them.
  try {
    const recovered = await sql`
      UPDATE _ops.worker_runs
      SET next_run_at = now()
      WHERE
        (last_run_at IS NOT NULL
         AND last_run_at < (next_run_at - (schedule_ms || ' milliseconds')::interval))
        OR
        (last_run_at IS NULL AND next_run_at > now() + interval '5 minutes')
    `;
    if (recovered.count > 0) {
      Logger.info("scheduler: recovered stale claims", { count: recovered.count });
    }
  } catch (e) {
    Logger.error("scheduler: stale-claim recovery failed", e);
  }
  state.timer = setInterval(() => {
    void (async () => {
      try {
        await tick();
      } catch (e) {
        Logger.error("scheduler: tick crashed", e);
      }
    })();
  }, TICK_MS);
}
