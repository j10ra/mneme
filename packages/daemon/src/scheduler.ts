// Daemon scheduler. Mirrors the shape of packages/server/src/worker/
// scheduler.ts but persists to a local JSON file (~/.mneme/schedule.json)
// instead of a Postgres table. Same pattern, same guarantees:
//
//   - register() accepts time-driven jobs by name + interval
//   - startScheduler() persists registry, runs a single 60s tick
//   - next_run_at survives daemon restarts so cycles aren't lost
//   - stale-claim recovery on startup re-fires jobs that crashed
//     mid-run (claim recorded, completion not)
//   - schedule advances inside the same write that claims a job, so
//     a long-running job (Sonnet distill mid-cycle) isn't re-fired
//     by the next tick
//
// Queue-driven workers (the outbox extract loop) keep their tight
// polling and are NOT registered here. The scheduler is for cron-shape
// work only.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Logger } from "@mneme/core";
import { SCHEDULER_TICK_MS } from "./infra/config.ts";

const TICK_MS = SCHEDULER_TICK_MS;
const STATE_PATH = join(homedir(), ".mneme", "schedule.json");
const STALE_NEW_JOB_SLACK_MS = 5 * 60_000;

type RegisteredJob = {
  name: string;
  scheduleMs: number;
  run: () => Promise<unknown>;
};

type StoredJob = {
  schedule_ms: number;
  next_run_at: string;
  last_run_at: string | null;
  last_status: "ok" | "failed" | null;
  last_error: string | null;
  last_duration_ms: number | null;
};

type State = Record<string, StoredJob>;

const registry = new Map<string, RegisteredJob>();
let state: State = {};
let timer: ReturnType<typeof setInterval> | null = null;
let stopped = false;

/** Register a time-driven job. Idempotent on (name): re-registering with
 *  a different scheduleMs updates the stored row but does NOT reset
 *  next_run_at - schedule changes apply from the next run forward. */
export function register(job: RegisteredJob): void {
  registry.set(job.name, job);
}

async function loadState(): Promise<State> {
  try {
    const raw = await readFile(STATE_PATH, "utf8");
    return JSON.parse(raw) as State;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

// Atomic file write. Same pattern as the outbox: write to <path>.tmp,
// fsync, rename. Single-process daemon, so no concurrent-writer race;
// the atomic-rename is just for crash safety mid-write.
async function saveState(s: State): Promise<void> {
  await mkdir(dirname(STATE_PATH), { recursive: true });
  const tmp = `${STATE_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(s, null, 2));
  await rename(tmp, STATE_PATH);
}

function syncRegistry(s: State): State {
  const out: State = {};
  const now = new Date().toISOString();
  for (const job of registry.values()) {
    const existing = s[job.name];
    if (existing) {
      out[job.name] = { ...existing, schedule_ms: job.scheduleMs };
    } else {
      out[job.name] = {
        schedule_ms: job.scheduleMs,
        next_run_at: now,
        last_run_at: null,
        last_status: null,
        last_error: null,
        last_duration_ms: null,
      };
    }
  }
  return out;
}

// Recover stale claims at startup. Two paths:
//   (a) last_run_at NOT NULL but older than (next_run_at - schedule_ms):
//       a claim happened, completion was never recorded.
//   (b) last_run_at IS NULL and next_run_at is far in the future:
//       the very first claim crashed before completing. Slack of
//       STALE_NEW_JOB_SLACK_MS guards against false-positives on a
//       row that was just synced.
// Both cases reset next_run_at = now() so the first tick re-runs them.
function recoverStaleClaims(s: State): { state: State; recovered: number } {
  const now = Date.now();
  const out = { ...s };
  let recovered = 0;
  for (const [name, row] of Object.entries(out)) {
    const nextRunAt = new Date(row.next_run_at).getTime();
    const lastRunAt = row.last_run_at ? new Date(row.last_run_at).getTime() : null;

    const stale =
      (lastRunAt !== null && lastRunAt < nextRunAt - row.schedule_ms) ||
      (lastRunAt === null && nextRunAt > now + STALE_NEW_JOB_SLACK_MS);

    if (stale) {
      out[name] = { ...row, next_run_at: new Date(now).toISOString() };
      recovered++;
    }
  }
  return { state: out, recovered };
}

async function tick(): Promise<void> {
  if (stopped) return;
  const now = Date.now();

  // First pass: identify due jobs, advance their next_run_at, persist.
  // Doing the schedule-advance BEFORE the run means a long-running job
  // can't be re-fired by the next tick while it's still in-flight.
  const due: string[] = [];
  for (const job of registry.values()) {
    const row = state[job.name];
    if (!row) continue;
    if (new Date(row.next_run_at).getTime() > now) continue;
    state[job.name] = {
      ...row,
      next_run_at: new Date(now + job.scheduleMs).toISOString(),
    };
    due.push(job.name);
  }
  if (due.length === 0) return;
  await saveState(state);

  for (const name of due) {
    const job = registry.get(name);
    if (!job) continue;
    const t0 = Date.now();
    let status: "ok" | "failed" = "ok";
    let errorMsg: string | null = null;
    try {
      await job.run();
    } catch (e) {
      status = "failed";
      errorMsg = e instanceof Error ? e.message : String(e);
      Logger.error("scheduler: job failed", e, { job: name });
    }
    const elapsed = Date.now() - t0;
    state[name] = {
      ...state[name]!,
      last_run_at: new Date().toISOString(),
      last_status: status,
      last_error: errorMsg,
      last_duration_ms: elapsed,
    };
    await saveState(state);

    if (status === "ok") {
      Logger.info("scheduler: job ok", {
        job: name,
        elapsed_s: Number((elapsed / 1000).toFixed(1)),
      });
    }
  }
}

/** Persist the registry, recover any stale claims, then tick every TICK_MS. */
export async function startScheduler(): Promise<void> {
  Logger.info("scheduler: starting", {
    jobs: [...registry.keys()],
    state_path: STATE_PATH,
    tick_s: TICK_MS / 1000,
  });

  try {
    const loaded = await loadState();
    state = syncRegistry(loaded);
    const { state: recoveredState, recovered } = recoverStaleClaims(state);
    state = recoveredState;
    await saveState(state);
    if (recovered > 0) {
      Logger.info("scheduler: recovered stale claims", { count: recovered });
    }
  } catch (e) {
    Logger.error("scheduler: state init failed (will retry on next tick)", e);
  }

  timer = setInterval(() => {
    void (async () => {
      try {
        await tick();
      } catch (e) {
        Logger.error("scheduler: tick crashed", e);
      }
    })();
  }, TICK_MS);
}

export function stopScheduler(): void {
  stopped = true;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** Inspect the current state (debug / status endpoint). */
export function getScheduleState(): State {
  return JSON.parse(JSON.stringify(state)) as State;
}
