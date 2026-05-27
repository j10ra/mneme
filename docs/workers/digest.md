# Digest — every 24h, on the server, opt-in

The **cross-cluster pass** the daemon dream can't do. Daemon dream operates per-machine per-window; digest sees all clusters across all machines and applies operations that need a global view.

> Reads for context: [`dream.md`](./dream.md).
> Sibling workers: [`nap.md`](./nap.md), [`dream.md`](./dream.md).
> Worker file: [`/packages/server/src/worker/digest.ts`](../../packages/server/src/worker/digest.ts).

---

## What digest does

**Op1 — Merge duplicate clusters.** Find pairs of `kind='cluster'` rows at cosine `< DIGEST_MERGE_DISTANCE = 0.20`. The threshold is intentionally looser than dream's `DREAM_CLUSTER_DISTANCE = 0.10`: raw observations at 0.20 cosine are often just topically adjacent, but cluster summaries are already-distilled prose at a higher abstraction level so 0.20 between two summaries is functionally "same topic" most of the time. **Asymmetric tuning** — raw clustering stays tight at 0.10; summary-level merge is the permissive layer that gathers adjacent topics back together.

For each pair within the cosine threshold, Sonnet (via OpenRouter) judges `same_topic` via `CLUSTER_MERGE_PROMPT`. If true:
- Higher-importance cluster wins as canonical
- Loser's `meta.member_ids` are concatenated onto winner's `meta.member_ids`
- Loser gets `meta.superseded_by = winner.id` AND `meta.in_cluster` cleared atomically
- Every member where `meta.in_cluster = loser.id` is repointed to `winner.id`

This is the only legal way to re-point a member's cluster id.

**Op2 — Cross-cluster supersede.** Pull memory pairs that span different `meta.in_cluster` values, same repo, neither is itself a `kind='cluster'` summary, not pinned, not already superseded, within `SUPERSEDE_LLM_ADJACENT_COSINE_MAX = 0.15` cosine. Order by `meta.last_digested_at NULLS FIRST` (watermark-paginated). Send candidates to Sonnet in batches of `SUPERSEDE_LLM_BATCH_MAX_MEMBERS = 30`; validate each returned pair (both ids in the candidate set; older actually older); write `meta.superseded_by` AND clear `meta.in_cluster` atomically. Catches the case where machine A and machine B independently captured "we use X" / "we now use Y" and the local dream passes never saw both.

**Ordering matters.** Op1 runs first; the cleaner cluster landscape gives Op2 better signal. In practice Op2 yield is naturally low (the supersede prompt is conservative; most cross-cluster near-pairs are different topics, not contradictions). The main supersede engine is dream's intra-cluster pass.

---

## Properties

| Property | Value |
|---|---|
| Schedule | Every 24h (`scheduleMs = 24 * 60 * 60 * 1000`) |
| Default | **Off**. Set `MNEME_DIGEST_ENABLED=1` to opt in. |
| Provider | Sonnet via OpenRouter (`pickDream()` with the cloud-only path) |
| Scope | Per-repo (matches dream's per-repo scoping). No machine_id filter — server-side, sees the global cluster graph. **No `private` filter** (see note below). |
| Output | `meta.superseded_by` on losing clusters (Op1) and on memory pairs (Op2); concatenated `meta.member_ids` on the winning cluster; repointed `meta.in_cluster` on absorbed members |
| Per-cycle caps | `DIGEST_MERGE_WINDOW = 100` (clusters pulled per cycle, watermark-ordered), `DIGEST_MAX_MERGE_PAIRS = 20` (Sonnet calls for the merge pass), `DIGEST_MAX_SUPERSEDE_CANDIDATES = 200` (≈ 7 batches at `SUPERSEDE_LLM_BATCH_MAX_MEMBERS = 30`). |
| Watermark | `meta.last_digested_at` stamped on Op1 cluster window AND Op2 member candidates so successive cycles round-robin the whole corpus, indexed via migration 0027. |
| Worker | `packages/server/src/worker/digest.ts` |

---

## Privacy note

Unlike [`dream`](./dream.md), digest does **not** apply the `(private = false OR machine_id = caller)` filter — it runs on the server with no machine identity, and its queries select across every memory regardless of `private`. This is currently moot (the `private` flag isn't set at the capture layer), but if private capture is ever wired up, digest will need a matching filter before it ships, or it will send private content from one machine to OpenRouter when reconciling cross-cluster supersedes that touch private rows from another.

---

## Why opt-in

Digest costs Sonnet calls per cycle on a separate quota (OpenRouter) — that wants to be a deliberate choice, not a default. At single-user scale the per-machine [`dream.md`](./dream.md) is enough for ~95% of the work; digest catches the residual cross-machine consolidation. Worth enabling once dream has produced enough clusters that you start seeing duplicates form across machines.

---

## See also

- [`nap.md`](./nap.md), [`dream.md`](./dream.md) — the other two brain workers. Together they implement the bitemporal pattern: nothing ever gets deleted (only archived), but recall sees only the current truth.
- [`../recall.md`](../recall.md) — `meta.superseded_by` on losing clusters gets `× 0.3` rank-down in recall, same as superseded individual memories.
- [`/packages/server/src/llm/pick.ts`](../../packages/server/src/llm/pick.ts) — the picker digest uses to route between OpenRouter and the local fallback.
