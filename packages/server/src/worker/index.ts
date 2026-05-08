// Server-side worker entry. Used to drive a tight extract+embed polling
// loop too, but as of #22 the per-machine daemon owns extract+embed (and
// dream coordination via Postgres advisory lock). Server now only runs
// the scheduler-driven jobs:
//   - nap     (every 6h): decay importance, shadow-mark exact dupes,
//              link semantically related memories
//   - dream   (every 24h): cluster + distil. Daemons race for the
//              window's advisory lock; whoever wins runs the cycle.
//              Server-side dream stays as a backstop / future home for
//              cross-machine "big dream" consolidation at a higher tier.
//   - keepalive (every 24h): SELECT 1 to keep the connection pool warm.
//
// startWorker is non-blocking; the scheduler runs until process exit.
// stopWorker is exported for graceful shutdown in server/index.ts but
// the scheduler doesn't strictly need an explicit stop (its setInterval
// is unref()'d).

import { Logger } from "@mneme/core";
import { runDreamOnce } from "./dream.ts";
import { runKeepaliveOnce } from "./keepalive.ts";
import { runNapOnce } from "./nap.ts";
import { register, startScheduler } from "./scheduler.ts";

export function startWorker(): void {
  Logger.info("worker: starting scheduler-driven jobs (nap, dream, keepalive)");
  register({ name: "nap", scheduleMs: 6 * 60 * 60 * 1000, run: runNapOnce });
  register({
    name: "dream",
    scheduleMs: 24 * 60 * 60 * 1000,
    run: runDreamOnce,
  });
  register({
    name: "keepalive",
    scheduleMs: 24 * 60 * 60 * 1000,
    run: runKeepaliveOnce,
  });
  void startScheduler();
}

/** Reserved for graceful shutdown in server/index.ts. The scheduler's
 *  unref()'d timer doesn't need an explicit stop, but the export exists
 *  so the shutdown handler stays well-typed and can grow later. */
export async function stopWorker(): Promise<void> {
  Logger.info("worker: stop requested (scheduler will exit with the process)");
}
