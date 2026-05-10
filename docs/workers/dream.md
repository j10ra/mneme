# Dream — every 8 hours, on the daemon (LLM in the loop)

The **distillation pass**. Clusters memories that talk about the same thing, calls Sonnet (via the Claude Agent SDK on the user's `claude` login) to write a one-paragraph summary, and persists that summary as a new `kind='cluster'` row.

Member memories stay queryable; the cluster sits above them and outranks them for broad recall queries. claude-mem's "compact-as-a-new-file" pattern, applied to rows.

> Reads for context: [`../concepts.md`](../concepts.md), [`../capture-pipeline.md`](../capture-pipeline.md).
> Sibling workers: [`nap.md`](./nap.md), [`digest.md`](./digest.md).
> Constants live in [`/packages/server/src/infra/config.ts`](../../packages/server/src/infra/config.ts).

---

## Why daemon-side, not server-side

Three reasons, all rooted in cost and authentication:

1. **The user already pays for `claude`.** Running Sonnet through the Agent SDK on a machine where the user is already logged in costs nothing extra. Server-side dream would require API keys the user separately pays for.
2. **Cross-machine coordination is cheap with one row.** With three machines, three daemons each tick "is it dream-time?". A Postgres advisory lock on `_ops.dream_runs` keyed by the 8-hour window slot makes exactly one of them succeed; the others see a held lock and skip. No leader election protocol, no heartbeats — Postgres is the truth.
3. **Failures are isolated to one machine.** A bad cluster on one daemon doesn't poison the others' next attempt — the lock releases at cycle end and the next slot is fresh.

---

## Flow

```mermaid
flowchart TD
    A[daemon scheduler · 8h] --> B{advisory lock<br/>_ops.dream_runs}
    B -- "got lock" --> C[POST /api/dream/candidates<br/>per repo, eligible memories]
    B -- "lock held" --> Z[skip · another machine is dreaming]
    C --> D[Build cosine-NN edges<br/>distance < 0.10, same repo<br/>via HNSW LATERAL JOIN]
    D --> E[Union-find connected components]
    E --> F{size 3..20?}
    F -- "no" --> G[skip cluster]
    F -- "yes" --> H[Claude SDK · streaming JSON<br/>{title, summary}]
    H --> I[POST /api/dream/clusters<br/>insert kind='cluster' memory<br/>+ mark members meta.in_cluster]
    I --> J[server enqueues embed for cluster row]
    I --> K{cloud LLM available?}
    K -- "yes" --> L[supersede pass<br/>cluster + cosine-near neighbours]
    L --> M[validate pairs → meta.superseded_by]
    K -- "no" --> N[skip · 7B/3B too risky for declaring obsolescence]
```

---

## Eligibility skip-list

These never enter a cluster:
- `kind='cluster'` rows (the cluster summaries themselves)
- Pinned memories (user-curated, shouldn't be subsumed)
- Shadowed rows (`meta.shadow_of IS NOT NULL`)
- Superseded rows (`meta.superseded_by IS NOT NULL`)
- Anything where `meta.in_cluster IS NOT NULL` (already in a cluster)

---

## Distill prompt

One Sonnet call per cluster, capped at `DREAM_MAX_CLUSTER_SIZE = 20` so prompts stay bounded. Returns `{ title, summary }`:
- **title** — one short phrase
- **summary** — 1–3 sentences synthesising the cluster

The persisted `kind='cluster'` row gets:
- `content = summary`
- `meta.cluster_title`
- `meta.member_ids = [...]`
- `meta.distiller_provider`, `meta.distiller_model` (provenance)
- `importance = 0.8`
- inherits `capture_id` / `machine_id` / `repo` from the seed (oldest) member

The cluster row itself goes through the daemon's normal embed path so it's queryable like any other memory.

**Cluster size bounds:** `DREAM_MIN_CLUSTER_SIZE = 3`, `DREAM_MAX_CLUSTER_SIZE = 20`. Components outside this range are skipped this cycle.

**Cosine threshold:** `DREAM_CLUSTER_DISTANCE = 0.10` (tighter than nap's 0.15 — cluster members must be genuinely about the same thing, not just topically adjacent).

---

## Member marking is sticky

Each member memory gets `meta.in_cluster = <cluster_id>` so the next dream pass on any machine skips it. **Cluster membership is sticky by design** — once set, only the digest worker (see [`digest.md`](./digest.md)) can re-point it via cluster merges.

---

## LLM supersede (post-distill)

After distillation, a second LLM call against `findSupersedes` asks "among these memories, which (if any) are superseded by which?". The candidate set is the cluster's members **plus** their cosine-near neighbours (`SUPERSEDE_LLM_ADJACENT_COSINE_MAX = 0.15`, `SUPERSEDE_LLM_ADJACENT_AGE_WINDOW = 60 days`, not pinned, not already superseded) — adjacent inclusion catches cases where wording shifted enough that old + new don't co-cluster.

Returns pairs `[{ old_id, new_id, reason }]` which the daemon validates (both ids must be in the candidate set; the older must actually be older) before posting to `/api/dream/clusters` with the supersede pairs included. The server writes `meta.superseded_by` inside the same transaction as the cluster insert.

**Cluster-level supersede (one cluster summary subsuming another) is intentionally not implemented in v1.** The rank-down penalty on individual members handles most of what cluster-level would address; the rest is digest's job.

**Validation is structural, not semantic.** The validator checks ordering (`older.created_at < newer.created_at`) and that both ids are in the candidate set. It does **not** fact-check the LLM's "X replaces Y" claim. This is why supersede chains in high-velocity feature work can look noisy — same fact captured four times, three rounds of correctly-validated supersedes.

---

## Cost per cycle

~5–15 clusters × ~3k input tokens × ~200 output tokens, paid in `claude` quota the user already has. Unlike extract, dream isn't latency-sensitive (it runs in the background) so per-cluster timeouts can be generous.

---

## See also

- [`nap.md`](./nap.md) — runs alongside dream; nap handles decay, shadows, relations, rule-based supersede.
- [`digest.md`](./digest.md) — the only worker that can re-point `meta.in_cluster` (via cluster merges).
- [`../recall.md`](../recall.md) — how `kind='cluster'` rows participate in recall scoring.
- [`../surface.md`](../surface.md) — Themes section in the SessionStart surface renders the most-relevant cluster summaries first.
