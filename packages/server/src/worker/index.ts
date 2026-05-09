// Server-side worker entry. Used to drive a tight extract+embed polling
// loop too, but as of #22 the per-machine daemon owns extract+embed
// (and dream coordination via Postgres advisory lock). Server now runs
// the three brain-trio scheduler-driven jobs:
//   - nap       (every 6h): decay importance, shadow-mark exact dupes,
//                link semantically related memories. Paginated via
//                meta.last_napped_at round-robin (cap NAP_PER_CYCLE_CAP).
//   - ascend    (every 7d, gated by MNEME_ASCEND_ENABLED): global
//                cross-cluster operations the per-machine daemon dream
//                can't do — merge duplicate clusters, run cross-cluster
//                supersede. Sonnet-grade via openrouter, conservative
//                refinement (#30). Off by default.
//   - keepalive (every 24h): SELECT 1 to keep the connection pool warm.
//
// startWorker is non-blocking; the scheduler runs until process exit.
// stopWorker is exported for graceful shutdown in server/index.ts but
// the scheduler doesn't strictly need an explicit stop (its setInterval
// is unref()'d).

import { Logger } from "@mneme/core";
import { env } from "../infra/env.ts";
import { runAscendOnce } from "./ascend.ts";
import { runKeepaliveOnce } from "./keepalive.ts";
import { runNapOnce } from "./nap.ts";
import { register, startScheduler } from "./scheduler.ts";

export function startWorker(): void {
  const jobs = ["nap", "keepalive"];
  if (env.ASCEND_ENABLED) jobs.splice(1, 0, "ascend");
  Logger.info(`worker: starting scheduler-driven jobs (${jobs.join(", ")})`);

  register({ name: "nap", scheduleMs: 6 * 60 * 60 * 1000, run: runNapOnce });

  if (env.ASCEND_ENABLED) {
    register({
      name: "ascend",
      scheduleMs: 7 * 24 * 60 * 60 * 1000,
      run: runAscendOnce,
    });
  } else {
    Logger.info("worker: ascend disabled (set MNEME_ASCEND_ENABLED=1 to opt in)");
  }

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
