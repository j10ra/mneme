// Daemon tuning knobs. Numbers and strings only.
//
// Same convention as packages/server/src/infra/config.ts: one file per
// package, every tuning knob lives here, no knob-shaped constants at
// the top of a worker. Per-provider extract/dream wire-shape contracts
// (context window, streaming behaviour) stay with their providers.
//
// Group by subsystem. New knob? Add it here, not at the top of the
// caller. Anti-pattern: a `const FOO_MS = 60_000;` declared in the
// file that uses it -- promote it here so the operator can find every
// tuning knob in one place.

// ── Worker scheduling ─────────────────────────────────────────────────

/** Tick rate for the daemon's local scheduler (per-machine state.json
 *  driven jobs). Mirrors the server scheduler's tick on the server side;
 *  the two are independent runtimes that happen to use the same cadence. */
export const SCHEDULER_TICK_MS = 60_000;

// ── Dream (clustering) ────────────────────────────────────────────────

/** Wall-clock width of one dream window. Daemons cron-offset within
 *  this so cross-machine claims don't collide. The server's lock is
 *  keyed on floor(now()/WINDOW). */
export const DREAM_WINDOW_HOURS = 8;

/** Cluster member count bounds. Below MIN, the union-find component is
 *  too thin to merit a distill call; above MAX, the cluster is too
 *  diffuse and the Sonnet prompt blows out. Both bounds are enforced
 *  inside buildComponents' caller. */
export const DREAM_MIN_CLUSTER_SIZE = 3;
export const DREAM_MAX_CLUSTER_SIZE = 20;

// ── Crystallize (concept synthesis, every 24h) ────────────────────────

/** Wall-clock width of one crystallize window. Less frequent than dream
 *  since it reads cluster summaries (already distilled) and synthesises
 *  high-level concept rows. */
export const CRYSTALLIZE_WINDOW_HOURS = 24;

/** Hard cap on concepts the daemon synthesises per repo per cycle.
 *  Caps LLM output and keeps the concept table lean. */
export const CRYSTALLIZE_MAX_CONCEPTS_PER_REPO = 25;
