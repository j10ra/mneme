# Worker pagination + reliability — design

- **Date:** 2026-05-22
- **Status:** approved, ready for implementation plan
- **Scope:** `nap`, `dream`, `digest` workers. Make all three reliable and able to weave the entire corpus.

---

## Problem

A corpus audit found cluster coverage stuck at roughly 1.6% (235 of about 14,500 memories). Root cause, confirmed in code and against the live DB:

**Dream has no pagination.** `fetchDreamCandidates` (`packages/server/src/routes/dream.ts:151-195`) selects seeds with `ORDER BY created_at DESC LIMIT 500` and no advancing cursor. The candidate set is a fixed sliding window pinned to the newest ~500 un-clustered memories. Measured: the 500th-newest eligible row is about 1 day old, so dream only ever sees the last ~24h of memories. Of 14,303 eligible un-clustered memories, 10,418 (73%) are older than 7 days and permanently unreachable. The in-code comment claiming "multiple dream cycles drain the inaugural backlog" is false. Nothing advances the window.

**Compounding (daemon):** `buildComponents` (`packages/daemon/src/dream.ts:45-77`) only unions edges where both endpoints are seeds, and cluster members are built purely from the seed map (`dream.ts:261-263`). Even when the server's LATERAL finds an old memory near a seed, that edge is discarded. Both ends of a clusterable pair must sit inside the window.

**Digest** is enabled and running (every 48h, about 7s), but its candidate selection cannot weave. Operation 1 (`findMergePairs`) and Operation 2 (`findCrossClusterSupersedeCandidates`, `LIMIT 200`, no ordering) have no watermark. Today the clustered population is small enough that this is masked; once dream's fix inflates it, both operations will only ever see an arbitrary slice.

**nap** already round-robins the whole corpus via `meta.last_napped_at`, so it weaves correctly. But its last cycle ran about 60s as a single transaction against Postgres' 120s `statement_timeout`. The risk is the three full-table passes (importance decay, recall_weight decay, shadow-marking), which scale unbounded with total corpus size.

**Separate bug (digest):** 8 cluster members are stranded on a superseded cluster (`682ff4f6`, superseded by `0b0c38ce`). `loadCluster` (`digest.ts:112-128`) has no `superseded_by` filter, so within one digest cycle a cluster superseded by an earlier merge can still be loaded and used as a winner in a later merge, re-pointing the loser's members onto a dead cluster.

---

## Goal

`nap`, `dream`, and `digest` each:

1. **Weave the entire corpus.** Every eligible memory is visited on a bounded round-robin, oldest-unvisited first, regardless of age.
2. **Stay reliable.** No worker statement or transaction drifts toward the 120s `statement_timeout` as the corpus grows.

---

## Shared mechanism — `meta` jsonb watermark

Mirror the existing, proven `meta.last_napped_at` pattern rather than introducing typed columns or a cursor table.

- Dream stamps `meta.last_dreamed_at`; digest stamps `meta.last_digested_at`.
- Both are ISO-8601 timestamp strings, which sort lexically the same as chronologically (so the raw `meta->>'...'` text expression is directly indexable, with no non-IMMUTABLE `::timestamptz` cast).
- Each is backed by a partial functional index modelled on migration 0019.
- Seed selection: `ORDER BY meta->>'<watermark>' NULLS FIRST, created_at ASC LIMIT <cap>`. `NULLS FIRST` drains never-visited rows before round-robining.
- Every row a cycle considers is stamped with `now()`, whether or not it produced a cluster, merge, or supersede. This is what makes the round-robin advance: a row that found nothing is not re-picked ahead of never-visited rows.

---

## Section 1 — Dream: watermark + neighbor-inclusion

The watermark alone is a half-fix. It gives **breadth** (every memory eventually becomes a seed over a full sweep) but clustering still needs 3 or more co-resident seeds. Neighbor-inclusion gives **depth** (a cluster forms when one seed pulls in its topical neighborhood). Both are required.

### 1a. Watermark seed selection — `packages/server/src/routes/dream.ts`

- `fetchDreamCandidates` seeds CTE: change `ORDER BY created_at DESC` to `ORDER BY meta->>'last_dreamed_at' NULLS FIRST, created_at ASC`. Keep `LIMIT DREAM_MAX_CANDIDATES_PER_CYCLE` (500).
- After selecting the seed ids, stamp `meta.last_dreamed_at = now()` on all of them in the same request. The `/api/dream/candidates` handler already verifies the caller holds the window lock, so "handed to a dream cycle" is a coherent, lock-gated stamp point. Stamping at fetch time (not at cluster-write time) is crash-safe: a daemon that dies mid-cycle does not lose the stamp; those seeds simply wait for the next sweep.
- The endpoint becomes a GET with a write side effect. This is acceptable because the call is already lock-gated and single-purpose ("claim these candidates for this window").

### 1b. Neighbor-inclusion — server response + `packages/daemon/src/dream.ts`

- **Server:** the candidate response currently sends `seeds` (full content) plus `edges` (id pairs referencing neighbors by id only). Change it to also send neighbor rows' `content`, `kind`, and `created_at`. Concretely: return one `memories` list per repo containing every distinct memory referenced as a seed or an edge endpoint, plus the `edges` list.
- **Daemon:** `buildComponents` is called with the union of all node ids appearing in `memories` (seeds and neighbors), not just seed ids. `memberMemories` is built from the combined map so a non-seed neighbor can be a cluster member and gets distilled.
- Membership writes (`meta.in_cluster`) already cover all `member_ids` in `writeClusters`, so no change is needed there. A neighbor pulled into a cluster is marked correctly.
- Neighbors are not stamped with `last_dreamed_at`. Only seeds are the round-robin unit (this mirrors nap, where off-page memories receiving `related_to` edges are not stamped). A neighbor that clusters leaves the pool via `in_cluster`; one that does not will become a seed on its own watermark turn.

### Index

New partial functional index on `(meta->>'last_dreamed_at') NULLS FIRST, created_at`, `WHERE archived_at IS NULL AND embedding IS NOT NULL`, matching the dream seed-selection predicate. Migration 0027.

---

## Section 2 — Digest: watermark on Op1 + Op2

One shared `meta.last_digested_at` field. Op1 stamps it on **cluster** rows; Op2 stamps it on **member** rows. Different row kinds, no collision.

### Op2 — cross-cluster supersede (`findCrossClusterSupersedeCandidates`, `digest.ts:161-192`)

- Add `ORDER BY a.meta->>'last_digested_at' NULLS FIRST` (with `created_at ASC` tiebreak) to the candidate scan. Keep `LIMIT DIGEST_MAX_SUPERSEDE_CANDIDATES` (200).
- After the supersede batches run, stamp `meta.last_digested_at = now()` on all candidates returned by the scan (every row considered, not just those that produced a supersede).

### Op1 — cluster merge (`findMergePairs`, `digest.ts:89-110`)

- Bias the merge-pair scan toward least-recently-digested clusters: order so the `a` side prefers `meta->>'last_digested_at' NULLS FIRST`. The `b` side stays "any non-superseded cluster in cosine range," so a stale-to-fresh pair is still found.
- After the merge loop, stamp `meta.last_digested_at = now()` on every cluster considered this cycle (loaded as an `a` or `b` side), whether or not it merged.

### Index

Partial functional index on `(meta->>'last_digested_at') NULLS FIRST, created_at`, `WHERE archived_at IS NULL`. Same migration 0027 as dream's index.

---

## Section 3 — nap hardening — `packages/server/src/worker/nap.ts`

`statement_timeout` is per-statement, so the risk is the three full-table passes that scale with total corpus size. The relate and supersede passes are already bounded by `NAP_PER_CYCLE_CAP` (500).

- **Split the single `sql.begin`** (`nap.ts:39-242`) into per-phase transactions: (1) importance decay, (2) recall_weight decay, (3) shadow-mark, (4) seed-pick plus relate plus supersede plus stamp. No transaction then holds locks for about 60s, and a slow phase fails in isolation instead of rolling back the whole cycle.
- **Batch the two decay passes** (importance decay `nap.ts:43-57`, recall_weight decay `nap.ts:64-69`) into bounded keyset chunks (for example 5,000 rows by `id` ascending, looped until exhausted). The result is identical, a constant multiplier, just split so no single statement scales unbounded.
- **Shadow-mark** (`nap.ts:79-101`) stays a single statement but in its own transaction. Its `UPDATE` only touches rows in duplicate groups (`HAVING count(*) > 1`); the cost is the `GROUP BY` scan, which is fast. If it later approaches the limit it can be batched by `content_hash` range. Noted, not done now.
- The seed-pick plus relate plus supersede plus stamp phase is already capped and unchanged in logic; it moves into its own transaction.

---

## Section 4 — Stranded-member bug (last item)

### Prevent new stranding — `loadCluster` (`digest.ts:112-128`)

Add `AND (meta->>'superseded_by') IS NULL` to the `WHERE`. A cluster superseded by an earlier merge in the same cycle then returns `null`, and the merge loop's existing `if (!a || !b) continue` (`digest.ts:233`) skips the pair. The still-valid merge (terminal cluster to the other cluster) is re-evaluated and applied on the next digest cycle, a 48h delay rather than a lost merge.

### Repair existing stranded members — migration 0028

Repoint `meta.in_cluster` for every memory pointing at a superseded cluster to the terminal (non-superseded) cluster of that supersede chain. A recursive CTE walks `superseded_by` to the chain end; chains are short. Fixes the current 8 stranded members and is a no-op if re-run.

---

## Migrations

- **0027** — two partial functional indexes: `memories_last_dreamed_at_idx` and `memories_last_digested_at_idx`, each modelled on migration 0019 (`0019_memories_last_napped_at_idx.sql`).
- **0028** — one-time data repair: repoint `meta.in_cluster` off superseded clusters onto chain terminals.

(Last existing migration is 0026; 0027 and 0028 are the next free numbers.)

---

## Testing

TDD per change. The repo runs `bun test`; tests live alongside source.

- **Dream watermark:** `fetchDreamCandidates` orders by `last_dreamed_at NULLS FIRST` and stamps every seed; a second cycle returns a disjoint (next) seed page; a never-dreamed backlog drains before any re-visit.
- **Dream neighbor-inclusion:** `buildComponents` over seeds and neighbors forms a cluster from a single seed plus two non-seed neighbors; the server response carries neighbor content.
- **Digest Op1/Op2 watermark:** least-recently-digested clusters and members are picked first; all considered rows are stamped.
- **nap hardening:** batched decay produces the same importance values as the prior single-statement decay; phases commit independently.
- **Stranded-member fix:** a unit test reproducing the A-to-B-to-C transitive merge within one cycle confirms no member is stranded on a superseded cluster; migration 0028 repoints a stranded member to the chain terminal.
- Full `bun run typecheck` plus `bun test` green before each section is considered done.

---

## Implementation order

1. **Dream** — watermark plus neighbor-inclusion (server plus daemon). Daemon change means a plugin version bump (`packages/plugin/.claude-plugin/plugin.json` plus `packages/plugin/package.json`).
2. **Digest** — Op1 plus Op2 watermark.
3. **nap hardening** — transaction split plus batched decay.
4. **Stranded-member bug** — `loadCluster` filter plus migration 0028. Last, as specified.

Migration 0027 (indexes) lands with section 1 and 2; migration 0028 with section 4.

---

## Risks / trade-offs

- **Backlog drain time.** Once the dream watermark lands, the roughly 14k backlog drains over about 28 cycles, roughly 9 days (`NULLS FIRST` puts never-dreamed rows first). `LIMIT 500` is kept; it matches nap and the Railway gateway-timeout reasoning. Steady drain is preferred over a temporary high-cap backfill.
- **Dream response payload.** Neighbor-inclusion grows the `/api/dream/candidates` response (up to `DREAM_MAX_NEIGHBORS_PER_MEMORY`, 20, neighbors per seed, deduped). Expected to be a 2x to 5x increase. If it becomes a problem, the per-seed neighbor cap is the lever. Noted, not pre-optimized.
- **GET with side effect.** `/api/dream/candidates` gains a write (the seed stamp). Acceptable: the call is lock-gated and exists solely to claim candidates for a window.

---

## Out of scope

- Changing `DREAM_MAX_CANDIDATES_PER_CYCLE`, `NAP_PER_CYCLE_CAP`, or the `DIGEST_*` caps.
- Cluster-size bounds (`DREAM_MIN/MAX_CLUSTER_SIZE`) and the dense-topic over-20-member skip.
- Re-evaluating borderline cluster memberships on cosine drift (explicitly a digest non-goal, issue #30).
- `prune` and `keepalive` workers.
- Cleanup of pre-existing duplicate-restatement clusters (for example the 15-member PR#3780 cluster), which is a separate corpus-hygiene effort.
