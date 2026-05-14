---
description: Recall memories from Mneme
argument-hint: <query>
scope: user
allowed-tools: mcp__plugin_mneme_mneme__mneme_sql
---

The user wants to recall Mneme memories about:

$ARGUMENTS

Use the `mneme_sql` MCP tool with the default hybrid recall pattern from the `using-mneme` skill (load the skill body if you haven't already).

Run a query like this (substitute the query text into both `embed(...)` and `websearch_to_tsquery(...)`; escape single quotes by doubling them if needed):

```sql
-- mneme:source=recall
SELECT id, content, kind, repo, importance, meta->'related_to' AS related_to, created_at
FROM memories
WHERE archived_at IS NULL
  AND (meta->>'shadow_of') IS NULL
  AND (meta->>'superseded_by') IS NULL
ORDER BY
  0.50 * (1 - (embedding <=> embed('the user query'))) +
  0.35 * ts_rank(tsv, websearch_to_tsquery('english', 'the user query')) +
  0.10 * exp(-extract(epoch from (now() - created_at)) / 86400.0 / 7) +
  0.05 * importance +
  0.10 * ln(1 + recall_weight)
DESC
LIMIT 8;
```

The `-- mneme:source=recall` marker is the cheapest way to tell the server this query came from the user-invoked `/recall` (vs ambient `mneme_sql` access). The server uses it to apply full-strength use-driven reinforcement (`recall_weight`) to the rows you return. Don't remove the marker.

Four terms:
- semantic similarity, keyword overlap, recency boost (up to +0.10 with a ~7-day decay), and a small importance tiebreaker so high-signal memories (decisions, constraints) rank above incidental ones at the same similarity.

If a top hit has `related_to` neighbours, follow up with the co-render query in `using-mneme` and group them under the parent ("X — also see related: A, B, C") rather than as separate top results.

Then **read the rows and answer the user's question naturally**, like a colleague who just looked something up. The user wants understanding, not a database dump.

Style:
- Conversational prose. Don't surface metadata (id, kind, repo, timestamp) unless the answer specifically depends on it. The raw rows stay in the tool response — you can refer back to them for follow-ups without echoing them upfront.
- Synthesise across rows where they overlap. If three memories all point to the same decision, state it once with the rationale, not three times.
- If a specific memory is the answer, quote the salient phrase, not the full row.
- If the rows don't really answer the question, say so — don't pad with marginally-related rows.

Length: match the question. A specific question gets 1-3 sentences. A broader "what was I working on" gets a short paragraph.

**Machine-scoped queries:** if the query names a specific machine (e.g. "what was I working on macbook-air-bc"), resolve the name first, then filter by the top-level `machine_id` column — NOT `meta->>'machine_id'` (that key doesn't exist):

```sql
-- mneme:source=recall
-- Step 1: resolve name → UUID
SELECT machine_id FROM _ops.machines
WHERE name = 'macbook-air-bc' AND revoked_at IS NULL;

-- mneme:source=recall
-- Step 2a: query memories by machine_id (top-level column)
SELECT id, content, kind, repo, importance, created_at
FROM memories
WHERE archived_at IS NULL
  AND (meta->>'shadow_of') IS NULL
  AND (meta->>'superseded_by') IS NULL
  AND machine_id = '<uuid from step 1>'
ORDER BY created_at DESC
LIMIT 15;

-- mneme:source=recall
-- Step 2b: if memories are sparse, query captures instead
SELECT source, repo, captured_at, substring(content, 1, 300) AS preview
FROM captures
WHERE archived_at IS NULL
  AND machine_id = '<uuid from step 1>'
ORDER BY captured_at DESC
LIMIT 20;
```

**Fallback when memories is empty:** if the query above returns 0 rows, the `memories` table likely hasn't been populated yet for this corpus (the extractor + embedder workers haven't processed the captures). Re-run against `captures.content` with ILIKE before declaring no results:

```sql
-- mneme:source=recall
SELECT id, source, repo, machine_id, captured_at, substring(content, 1, 200) AS preview
FROM captures
WHERE archived_at IS NULL
  AND content ILIKE '%' || 'the user query' || '%'
ORDER BY captured_at DESC
LIMIT 10;
```

Same synthesis rules apply — read the previews, answer naturally, don't dump rows.

If both queries return zero rows, say so plainly and suggest broadening the query.
