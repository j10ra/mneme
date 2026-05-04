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

  // Find jobs due to run. SKIP LOCKED so multi-replica deploys (someday)
  // don't both fire the same job. We only lock+update one job at a time so
  // a long-running nap doesn't block keepalive's scheduling check.
  const due = await sql<{ job_name: string }[]>`
    SELECT job_name FROM _ops.worker_runs
    WHERE next_run_at <= now()
    ORDER BY next_run_at ASC
    LIMIT 5
    FOR UPDATE SKIP LOCKED
  `;

  for (const { job_name } of due) {
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
          next_run_at = now() + (${job.scheduleMs} || ' milliseconds')::interval,
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
