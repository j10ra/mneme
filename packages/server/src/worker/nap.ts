import { Logger, mnemeFn } from "@mneme/core";
import { sql } from "../db.ts";

// Run every 6h. Long enough that decay/shadow churn is meaningful per cycle,
// short enough that transient retry latency stays under a few hours.
const NAP_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Per-cycle multiplicative decay for non-pinned memories. With τ=30 days and
// 4 naps/day = 120 naps over the time constant, factor = exp(-1/120) ≈ 0.9917.
// After 30 days a memory's importance lands at original * 1/e (~37%).
const PER_NAP_DECAY = Math.exp(-1 / 120);

// Importance floor for non-pinned memories — never decay them to zero, just
// rank them low. Anything pinned is exempt from decay entirely.
const IMPORTANCE_FLOOR = 0.05;

// Hard reduction applied to memories shadowed in this cycle (exact-text dups).
const SHADOW_DECAY = 0.1;

// Transient error patterns. These match upstream-flake messages worth retrying
// after a grace window. Anything not matching is treated as content-related
// and retired to state='dead'. Uses POSIX regex (~*), so [0-9] not \d.
const TRANSIENT_REGEX = "HTTP 5[0-9][0-9]|timed out|timeout|ECONNRESET|tunnel|gateway|connection (refused|reset|closed|aborted)";

const SINGLETON_KEY = Symbol.for("mneme.nap.singleton");
type State = { stopped: boolean; timer: ReturnType<typeof setInterval> | null };
const g = globalThis as unknown as { [key: symbol]: State | undefined };

if (g[SINGLETON_KEY]) {
  g[SINGLETON_KEY].stopped = true;
  if (g[SINGLETON_KEY].timer) clearInterval(g[SINGLETON_KEY].timer);
}
const state: State = { stopped: false, timer: null };
g[SINGLETON_KEY] = state;

export type NapResult = {
  decayed: number;
  shadowed: number;
  resurrected: number;
  killed: number;
};

/** Run one nap cycle: decay non-pinned importance, mark exact-text shadows,
 *  resurrect transient ingest failures, retire non-transient errors to dead.
 *  All four steps run in one transaction — the whole pass is small (<1s on
 *  current data) and atomic state is easier to reason about. */
export const runNapOnce = mnemeFn(
  "worker.nap.once",
  async (): Promise<NapResult> => {
    return await sql.begin(async (tx) => {
      // 1. Decay non-pinned memories (skip rows already at floor for cheapness).
      const decayed = await tx`
        UPDATE memories
        SET importance = GREATEST(${IMPORTANCE_FLOOR}::real, importance * ${PER_NAP_DECAY}::real)
        WHERE archived_at IS NULL
          AND NOT COALESCE((meta->>'pinned')::boolean, false)
          AND importance > ${IMPORTANCE_FLOOR}::real
      `;

      // 2. Exact-text shadows: in each content_hash group, keep the highest-
      //    importance row; mark the rest as meta.shadow_of=<keeper>, importance×0.1.
      const shadowed = await tx`
        WITH groups AS (
          SELECT content_hash,
                 (array_agg(id ORDER BY importance DESC, created_at DESC))[1] AS keeper_id
          FROM memories
          WHERE archived_at IS NULL
            AND (meta->>'shadow_of') IS NULL
          GROUP BY content_hash
          HAVING count(*) > 1
        )
        UPDATE memories m
        SET importance = m.importance * ${SHADOW_DECAY}::real,
            meta = m.meta || jsonb_build_object('shadow_of', g.keeper_id::text)
        FROM groups g
        WHERE m.content_hash = g.content_hash
          AND m.id <> g.keeper_id
          AND (m.meta->>'shadow_of') IS NULL
      `;

      // 3. Resurrect transient ingest failures (1h grace).
      const resurrected = await tx`
        UPDATE ingest_jobs
        SET state = 'queued',
            attempts = 0,
            scheduled_at = now(),
            error = NULL,
            started_at = NULL,
            finished_at = NULL
        WHERE state = 'error'
          AND attempts >= 5
          AND finished_at < now() - interval '1 hour'
          AND error ~* ${TRANSIENT_REGEX}
      `;

      // 4. Retire non-transient errors to dead (24h grace).
      const killed = await tx`
        UPDATE ingest_jobs
        SET state = 'dead'
        WHERE state = 'error'
          AND attempts >= 5
          AND finished_at < now() - interval '24 hours'
          AND NOT (error ~* ${TRANSIENT_REGEX})
      `;

      return {
        decayed: decayed.count,
        shadowed: shadowed.count,
        resurrected: resurrected.count,
        killed: killed.count,
      };
    });
  },
);

async function tickNap(): Promise<void> {
  if (state.stopped) return;
  const t0 = Date.now();
  try {
    const r = await runNapOnce();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    Logger.info(
      `nap: decayed=${r.decayed}, shadowed=${r.shadowed}, resurrected=${r.resurrected}, killed=${r.killed} (${elapsed}s)`,
    );
  } catch (e) {
    Logger.error("nap: cycle failed", e);
  }
}

/** Schedule nap on the standard interval. Runs once after a 60s warmup so
 *  workers/keepalive get logged first, then every NAP_INTERVAL_MS thereafter. */
export function startNap(): void {
  Logger.info(`nap: scheduled every ${NAP_INTERVAL_MS / 3_600_000}h (decay τ=30d, retry grace 1h, dead grace 24h)`);
  setTimeout(() => {
    if (state.stopped) return;
    void tickNap();
  }, 60_000);
  state.timer = setInterval(tickNap, NAP_INTERVAL_MS);
}
