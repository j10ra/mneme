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

/** Scheduler tick rate for time-driven workers (nap, dream, keepalive).
 *  Server's tight extract+embed polling loops were retired in #29 Phase B
 *  (the per-machine daemon owns those now); only scheduler-driven jobs
 *  remain here. EXTRACT_INTERVAL_MS / EMBED_INTERVAL_MS plus the per-
 *  cycle extract/embed knobs went with them. */
export const SCHEDULER_TICK_MS = 60_000;

// ── Picker (LLM provider primary/fallback breaker) ────────────────────
// Still used by server-side dream via llm/pick.ts. Will go away if/when
// the bigger-dream consolidation plan retires the server-side LLM path.

export const PICKER_FAILURE_THRESHOLD = 3;
export const PICKER_COOLDOWN_MS = 5 * 60_000;

// ── Nap (decay + relations) ───────────────────────────────────────────

/** Per-cycle decay factor. e^(-1/120) ≈ 0.9917 — at 4 naps/day this
 *  yields τ=30 days for unpinned memories. */
export const NAP_DECAY_PER_CYCLE = Math.exp(-1 / 120);

/** Per-cycle seed cap for nap's relate-pass + supersede-rule pass.
 *  Round-robin gating happens via `meta.last_napped_at`: the cycle
 *  picks the N least-recently-napped memories, runs both passes on
 *  them, and stamps the timestamp at the end. With N=500 and 4 cycles
 *  a day, the full corpus refreshes every ~3.5 days at 7k memories,
 *  scaling linearly. The cap exists because Postgres' Railway-default
 *  `statement_timeout = 2min` was killing the relate-pass when the
 *  seed set was the entire 7-day window (effectively the whole table
 *  for fresh corpora). Inner LATERAL still scans the full memories
 *  table for HNSW lookups, so a seed in this cycle can still link
 *  to non-seed neighbours — pagination only limits which rows we
 *  examine *as* seeds. */
export const NAP_PER_CYCLE_CAP = 500;

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

// ── Supersede ─────────────────────────────────────────────────────────

/** Rule-based pass (runs in nap, every 6h). Tight cosine + explicit
 *  "this replaces that" wording — catches the obvious cases for free
 *  without an LLM call. Anything subtler is left to the dream pass. */
export const SUPERSEDE_RULE_COSINE_MAX = 0.05;

/** Newer memory must be at least this much newer than the older one
 *  before it's eligible to supersede — guards against same-batch
 *  rephrasings being treated as "the next version". */
export const SUPERSEDE_RULE_AGE_GAP = "12 hours";

/** Newer memory's content must contain one of these phrases
 *  (case-insensitive) for the rule pass to fire. */
export const SUPERSEDE_RULE_KEYWORDS = [
  "instead of",
  "no longer",
  "replaced",
  "now uses",
  "previously",
  "updated to",
  "deprecated",
  "swapped",
];

/** Cap per nap cycle so a one-time keyword bloom doesn't write thousands
 *  of `superseded_by` flags in a single tick. */
export const SUPERSEDE_RULE_PER_CYCLE_CAP = 50;

/** LLM pass (runs in dream, daily, cloud-only). Adjacent memories pulled
 *  in alongside the cluster's members must be within this cosine. */
export const SUPERSEDE_LLM_ADJACENT_COSINE_MAX = 0.15;

/** Adjacent memories considered for the LLM pass must be no older than
 *  this. Stops the prompt from ballooning over the entire history. */
export const SUPERSEDE_LLM_ADJACENT_AGE_WINDOW = "60 days";

/** Cap on cluster-members + adjacent-neighbors fed to one Sonnet call. */
export const SUPERSEDE_LLM_BATCH_MAX_MEMBERS = 30;

/** Recall ranking penalty applied to memories with `meta.superseded_by`
 *  set. 0.3 means a superseded memory needs to be ~3.3× more relevant
 *  than its successor to outrank it. Tunable here; recall query
 *  templates / using-mneme skill read this. */
export const SUPERSEDE_RECALL_PENALTY = 0.3;

// ── Ascend (cross-cluster consolidator, weekly) ───────────────────────
// Issue #30. Third worker in the brain trio (nap → dream → ascend).
// Where dream synthesises clusters from one window's memories, ascend
// rises above the per-cluster view to merge duplicate clusters and
// reconcile contradicting facts across cluster boundaries.

/** Cosine-distance ceiling for treating two cluster summaries as
 *  candidate "same topic". Tighter than DREAM_CLUSTER_DISTANCE because
 *  the input is already-distilled cluster summaries — near-duplicates
 *  merit the LLM call; loose adjacency does not. */
export const ASCEND_MERGE_DISTANCE = 0.10;

/** Max merge candidate pairs per ascend cycle. Bounds Sonnet call
 *  count. At ~50 clusters steady state and a tight cosine ceiling,
 *  real candidate pairs are rare (~5/week) — the cap is defensive,
 *  mostly relevant during the first few cycles after a data wipe when
 *  many fresh clusters cover overlapping topics. */
export const ASCEND_MAX_MERGE_PAIRS = 20;

/** Max cross-cluster supersede candidate memories pulled per cycle.
 *  Each batch of SUPERSEDE_LLM_BATCH_MAX_MEMBERS goes to one Sonnet
 *  call. 200 candidates ≈ 7 batches ≈ 7 LLM calls per cycle. */
export const ASCEND_MAX_SUPERSEDE_CANDIDATES = 200;
