# Digest — weekly, on the server, opt-in

The **cross-cluster pass** the daemon dream can't do. Daemon dream operates per-machine per-window; digest sees all clusters across all machines and applies operations that need a global view.

> Reads for context: [`dream.md`](./dream.md).
> Sibling workers: [`nap.md`](./nap.md), [`dream.md`](./dream.md).
> Worker file: [`/packages/server/src/worker/digest.ts`](../../packages/server/src/worker/digest.ts) (renamed from `ascend` in commit `bdedfd9`).

---

## What digest does

- **Merge duplicate clusters.** Find pairs of `kind='cluster'` rows at cosine `< DIGEST_MERGE_DISTANCE = 0.10` (tighter than dream's intra-cluster threshold because the input is already-distilled summaries — near-duplicates merit the merge; loose adjacency does not). For each pair the **higher-importance cluster wins as canonical**; the loser's `meta.member_ids` get appended to the winner, the loser gets `meta.merged_into = <canonical>`, and **all loser members' `meta.in_cluster` are repointed** to the winner. This is the only legal way to re-point a member's cluster id.
- **Cross-cluster supersede.** Pull memory pairs that span different `meta.in_cluster` values, are not pinned, not already superseded, and are within the LLM-pass cosine + age window. Send them to Sonnet in batches of `SUPERSEDE_LLM_BATCH_MAX_MEMBERS = 30`; validate each returned pair (both ids in the candidate set; older actually older); write `meta.superseded_by`. Catches the case where machine A and machine B independently captured "we use X" / "we now use Y" and the local dream passes never saw both.

---

## Properties

| Property | Value |
|---|---|
| Schedule | Weekly (`scheduleMs = 7 * 24h`) |
| Default | **Off**. Set `MNEME_DIGEST_ENABLED=1` to opt in. |
| Provider | Sonnet via OpenRouter (`pickDream()` with the cloud-only path) |
| Scope | Global — no per-repo or per-machine filter |
| Output | `meta.merged_into` on losing clusters, `meta.superseded_by` on memory pairs (cross-cluster) |
| Per-cycle caps | `DIGEST_MAX_MERGE_PAIRS = 20` (Sonnet calls for the merge pass), `DIGEST_MAX_SUPERSEDE_CANDIDATES = 200` (≈ 7 batches at `SUPERSEDE_LLM_BATCH_MAX_MEMBERS = 30`). Defensive bounds; real candidate pairs are sparse at steady state. |
| Worker | `packages/server/src/worker/digest.ts` (singleton-via-globalThis + `_ops.worker_runs` pattern, same as [`nap.md`](./nap.md)) |

---

## Why opt-in

Digest is a backstop for installations large enough to want a second consolidator pass. At personal scale (one user, three machines) the per-machine [`dream.md`](./dream.md) is usually enough, and the LLM cost wants to be a deliberate choice, not a default.

Turn it on when:
- You see noticeable duplicate clusters across machines (run `mneme_sql` to count `kind='cluster'` rows where two have similar `cluster_title` for the same `repo`).
- The "supersededCount" footer in your SessionStart surface is rising fast — digest's cross-cluster supersede catches what dream's intra-cluster pass misses.

---

## See also

- [`nap.md`](./nap.md), [`dream.md`](./dream.md) — the other two brain workers. Together they implement the bitemporal pattern: nothing ever gets deleted, but recall sees only the current truth.
- [`../recall.md`](../recall.md) — `meta.merged_into` doesn't have a special read-time treatment yet (clusters merge by repointing members; the duplicate's content stays queryable).
- [`/packages/server/src/llm/pick.ts`](../../packages/server/src/llm/pick.ts) — the picker digest uses to route between OpenRouter and the local fallback.
