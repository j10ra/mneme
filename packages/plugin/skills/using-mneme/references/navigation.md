# Navigation — walking the memory graph

Memories aren't isolated rows; they form a graph. After a Layer-1 hit, walk the relevant edges. Cluster summaries narrate; supersede chains show evolution; `related_to` widens context.

> Load when: you have a search hit and want the surrounding story (cluster + members), the current truth (supersede chain), or semantic neighbours.
> Prerequisite: you've already run a Layer-1 query and have a target UUID.
> See also: [`../SKILL.md`](../SKILL.md) for the 3-layer workflow.

---

## Edge types

| `meta.*` field | Direction | Set by | Read order |
|---|---|---|---|
| `in_cluster` | member → cluster | dream worker | follow first — gives the synthesised view |
| `member_ids[]` | cluster → members | dream worker | follow second, only if the summary is too compressed |
| `related_to[]` | bidirectional | nap worker | follow when no cluster exists OR for surrounding context |
| `superseded_by` | older → newer | nap (rule-based) + dream (LLM) | follow forward to find current truth |
| `shadow_of` | dup → kept | nap worker | rarely walked — shadows are exact-text dupes, content is identical |

---

## Walking a cluster

If a Layer-1 hit has `meta.in_cluster`, the cluster summary is almost always more useful than re-reading the members. Two simple queries:

```sql
-- 1. The cluster summary (one row, ~150-300 tokens)
SELECT id, importance, created_at,
       meta->>'cluster_title' AS title,
       meta->'member_ids'      AS member_ids,
       content                 AS summary
FROM memories
WHERE id::text = (
  SELECT meta->>'in_cluster' FROM memories WHERE id = '<top-hit-uuid>'
);
```

Read the summary. **Often this answers the question on its own.** Only run #2 if you actually need the raw story:

```sql
-- 2. The members (paste the member_ids array from #1)
SELECT id, kind, importance, created_at, substring(content, 1, 220) AS preview
FROM memories
WHERE id = ANY (ARRAY['<id1>', '<id2>', '<id3>']::uuid[])
ORDER BY created_at ASC;
```

Token budget: cluster summary ≈ 250 tokens; full member list of 8 memories ≈ 2000+ tokens. Default to summary-only.

---

## Walking related neighbours

Use when no cluster exists, or when the user wants surrounding context the cluster summary doesn't carry. **One hop is enough** — don't fan out neighbours-of-neighbours.

```sql
SELECT id, kind, importance, substring(content, 1, 200) AS preview
FROM memories
WHERE id = ANY (
        ARRAY(SELECT jsonb_array_elements_text(
                       (SELECT meta->'related_to' FROM memories WHERE id = '<seed-uuid>')
                     )::uuid)
      )
  AND archived_at IS NULL
ORDER BY (importance + 0.1 * ln(1 + recall_weight)) DESC
LIMIT 5;
```

When you summarise for the user, group neighbours under the parent ("X — also see related: A, B, C") rather than as separate top results.

---

## Walking the supersede chain

The `meta.superseded_by` edge is directional: older row points at the newer one that replaced it. Walk forward to find current truth, or backward to see history.

### Forward to current truth

```sql
WITH RECURSIVE chain AS (
  SELECT id, content, kind, created_at,
         meta->>'superseded_by' AS next_id, 0 AS hops
  FROM memories WHERE id = '<seed-uuid>'
  UNION ALL
  SELECT m.id, m.content, m.kind, m.created_at,
         m.meta->>'superseded_by', c.hops + 1
  FROM memories m JOIN chain c ON m.id::text = c.next_id
  WHERE c.hops < 10
)
SELECT id, kind, created_at, substring(content, 1, 200) AS preview, hops
FROM chain ORDER BY hops;
```

The last row (highest `hops`) is the current truth. The earlier rows are the history.

### Backward to find what this superseded

```sql
SELECT id, kind, created_at, substring(content, 1, 220) AS preview
FROM memories
WHERE meta->>'superseded_by' = '<current-uuid>'
  AND archived_at IS NULL;
```

Useful for "what did we used to do?" questions.

---

## Reading a chain narratively

When the user asks "how did this evolve?", combine the chain + cluster:

1. Run the forward chain query above. You now have an ordered timeline of rephrasings.
2. Read the chain. The deltas between adjacent rows usually contain the *why* — "we used to X, now we Y because Z".
3. Synthesise: "Originally, A. Then B because [reason if visible]. Currently, C."

If the chain has only one row (no `superseded_by`), the seed is current truth and there's no evolution to narrate.

---

## When clusters and supersede chains overlap

A memory can be both `in_cluster` and `superseded_by`. Order of traversal:

1. **Walk the supersede chain forward first.** Find the current truth.
2. **Then check the current row's `in_cluster`.** The cluster summary covers the synthesis; supersede chain covers the history.

Never start at a superseded row — you'll narrate stale truth.

---

## Stopping rules

- **One hop on `related_to`.** Two hops returns ~25 memories and the relevance is gone.
- **Max 10 hops on supersede chains.** Recursive query has a `hops < 10` guard for cycles.
- **Don't unfold cluster members unless the summary is genuinely too compressed.** The summary is the win; the members are the receipt.
- **Don't follow `shadow_of`.** Shadows are exact-text duplicates; the kept row's content is the same.
