// Server-side worker entry. The per-machine daemon owns extract + embed
// + dream coordination; the server runs the four scheduler-driven jobs:
//   - nap       (every 4h): decay importance + recall_weight, archive
//                irrelevant memories, link semantically related ones,
//                run the rule-based supersede pass. Paginated via
//                meta.last_napped_at round-robin (cap NAP_PER_CYCLE_CAP).
//                NAP_DECAY_PER_CYCLE (e^(-1/180)) and RECALL_LTD_DECAY
//                (0.933) are calibrated for 6 cycles/day so importance
//                τ stays 30 days and recall_weight half-life stays ~42h.
//                Archive phase targets memories with importance ≤ 0.1,
//                recall_weight = 0, age ≥ 30 days, not pinned/clustered/
//                superseded (cap NAP_ARCHIVE_PER_CYCLE_CAP). Archived
//                rows stay queryable via mneme_sql; they just stop
//                appearing in the SessionStart surface.
//   - digest    (every 24h, gated by MNEME_DIGEST_ENABLED): global
//                cross-cluster operations the per-machine daemon dream
//                can't do — merge duplicate clusters, run cross-cluster
//                supersede. Sonnet-grade via openrouter, conservative
//                refinement (#30). Off by default.
//   - keepalive (every 24h): SELECT 1 to keep the connection pool warm.
//   - prune     (every 24h): delete _ops.spans/traces/logs older than
//                TELEMETRY_RETENTION_DAYS to prevent unbounded growth.
//
// startWorker is non-blocking; the scheduler runs until process exit.
// stopWorker is exported for graceful shutdown in server/index.ts but
// the scheduler doesn't strictly need an explicit stop (its setInterval
// is unref()'d).

import { Logger } from "@mneme/core";
import { env } from "../infra/env.ts";
import { runDigestOnce } from "./digest.ts";
import { runKeepaliveOnce } from "./keepalive.ts";
import { runNapOnce } from "./nap.ts";
import { runPruneOnce } from "./prune.ts";
import { register, startScheduler } from "./scheduler.ts";

export function startWorker(): void {
  const jobs = ["nap", "keepalive"];

  if (env.DIGEST_ENABLED) jobs.splice(1, 0, "digest");
  Logger.info(`worker: starting scheduler-driven jobs (${jobs.join(", ")})`);

  register({ name: "nap", scheduleMs: 4 * 60 * 60 * 1000, run: runNapOnce });

  if (env.DIGEST_ENABLED) {
    register({
      name: "digest",
      scheduleMs: 24 * 60 * 60 * 1000,
      run: runDigestOnce,
    });
  } else {
    Logger.info("worker: digest disabled (set MNEME_DIGEST_ENABLED=1 to opt in)");
  }

  register({
    name: "keepalive",
    scheduleMs: 24 * 60 * 60 * 1000,
    run: runKeepaliveOnce,
  });

  register({
    name: "prune",
    scheduleMs: 24 * 60 * 60 * 1000,
    run: runPruneOnce,
  });

  void startScheduler();
}

/** Reserved for graceful shutdown in server/index.ts. The scheduler's
 *  unref()'d timer doesn't need an explicit stop, but the export exists
 *  so the shutdown handler stays well-typed and can grow later. */
export async function stopWorker(): Promise<void> {
  Logger.info("worker: stop requested (scheduler will exit with the process)");
}
