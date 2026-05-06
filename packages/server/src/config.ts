// Tuning knobs. Numbers and strings only — no env reads (those live in
// env.ts). Per-provider `extractLimits` / `dreamLimits` stay with their
// providers because they describe wire-shape contract (context window,
// streaming behaviour) rather than tuning.
//
// Group by subsystem. New knob? Add it here, not at the top of a worker.
// When a knob graduates to "operator wants to tune at runtime", it can
// be backed by a row in `_ops.config` (see issue #1, Phase 4) with the
// constant below remaining as the fallback default.

// ── Worker scheduling ─────────────────────────────────────────────────

/** Tight-poll interval for the extract worker loop. */
export const EXTRACT_INTERVAL_MS = 10_000;

/** Tight-poll interval for the embed worker loop. */
export const EMBED_INTERVAL_MS = 5_000;

/** Scheduler tick rate for time-driven workers (nap, dream, keepalive). */
export const SCHEDULER_TICK_MS = 60_000;

// ── Extract worker ────────────────────────────────────────────────────

/** Per-cycle circuit breaker for the extract worker. After this many
 *  consecutive cycle failures, the entire worker pauses for
 *  EXTRACT_BREAKER_PAUSE_MS so a downed LLM doesn't burn job attempts.
 *  Composes with the per-provider breaker (see PICKER_*): the per-
 *  provider one flips between local and openrouter; this one stops the
 *  worker if both stay unhealthy. */
export const EXTRACT_BREAKER_THRESHOLD = 3;
export const EXTRACT_BREAKER_PAUSE_MS = 5 * 60_000;

/** Window for coalescing same-session captures into one extract call. */
export const EXTRACT_COALESCE_WINDOW = "5 minutes";

/** A `running` extract job older than this is treated as crashed mid-
 *  flight and re-eligible. Bounded by LLM_TIMEOUT_MS plus headroom. */
export const EXTRACT_STALE_RUNNING = "15 minutes";

// ── Embed worker ──────────────────────────────────────────────────────

export const EMBED_BATCH_SIZE = 32;

/** A `running` embed job older than this is treated as crashed mid-
 *  flight and re-eligible. */
export const EMBED_STALE_RUNNING = "5 minutes";

// ── Picker (LLM provider primary/fallback breaker) ────────────────────

export const PICKER_FAILURE_THRESHOLD = 3;
export const PICKER_COOLDOWN_MS = 5 * 60_000;

// ── Nap (decay + relations) ───────────────────────────────────────────

/** Per-cycle decay factor. e^(-1/120) ≈ 0.9917 — at 4 naps/day this
 *  yields τ=30 days for unpinned memories. */
export const NAP_DECAY_PER_CYCLE = Math.exp(-1 / 120);

/** Floor for unpinned memories' importance after decay. */
export const NAP_FLOOR = 0.05;

/** Floor for pinned memories' importance — gives `pin` its meaning. */
export const NAP_PIN_FLOOR = 0.5;

/** Per-cycle multiplier for shadowed memories (exact-text duplicates). */
export const NAP_SHADOW_DECAY = 0.1;

/** Cosine-distance ceiling for adding to `meta.related_to`. */
export const NAP_RELATE_DISTANCE = 0.15;

/** Max neighbors per memory in the relate pass. */
export const NAP_RELATE_MAX_NEIGHBORS = 5;

// ── Dream (clustering) ────────────────────────────────────────────────

/** Cosine-distance ceiling for cluster membership. Tighter than
 *  NAP_RELATE_DISTANCE — cluster members must be genuinely about the
 *  same thing, not just topically adjacent. */
export const DREAM_CLUSTER_DISTANCE = 0.10;

export const DREAM_MIN_CLUSTER_SIZE = 3;
export const DREAM_MAX_CLUSTER_SIZE = 20;

/** Per-memory NN cap inside the LATERAL JOIN — keeps union-find bounded
 *  for hub memories in dense graphs. */
export const DREAM_MAX_NEIGHBORS_PER_MEMORY = 20;
