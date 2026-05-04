---
description: Recall memories from Mneme
argument-hint: <query>
allowed-tools: mcp__plugin_mneme_mneme__mneme_sql
---

The user wants to recall Mneme memories about:

$ARGUMENTS

Use the `mneme.sql` MCP tool with the default hybrid recall pattern from the `using-mneme` skill (load the skill body if you haven't already).

Run a query like this (substitute the query text into both `embed(...)` and `websearch_to_tsquery(...)`; escape single quotes by doubling them if needed):

```sql
SELECT id, content, kind, repo, importance, created_at
FROM memories
WHERE archived_at IS NULL
  AND (meta->>'shadow_of') IS NULL
  AND (meta->>'superseded_by') IS NULL
ORDER BY
  0.55 * (1 - (embedding <=> embed('the user query'))) +
  0.35 * ts_rank(tsv, websearch_to_tsquery('english', 'the user query')) +
  0.10 * exp(-extract(epoch from (now() - created_at)) / 86400.0 / 7)
DESC
LIMIT 8;
```

The third term is a recency boost — recent memories get up to +0.10, decaying with a 7-day half-life-ish curve. Old strongly-relevant memories still win on topic, but recent context stops getting buried under matches from weeks ago.

Then **read the rows and answer the user's question naturally**, like a colleague who just looked something up. The user wants understanding, not a database dump.

Style:
- Conversational prose. Don't surface metadata (id, kind, repo, timestamp) unless the answer specifically depends on it. The raw rows stay in the tool response — you can refer back to them for follow-ups without echoing them upfront.
- Synthesise across rows where they overlap. If three memories all point to the same decision, state it once with the rationale, not three times.
- If a specific memory is the answer, quote the salient phrase, not the full row.
- If the rows don't really answer the question, say so — don't pad with marginally-related rows.

Length: match the question. A specific question gets 1-3 sentences. A broader "what was I working on" gets a short paragraph.

**Fallback when memories is empty:** if the query above returns 0 rows, the `memories` table likely hasn't been populated yet for this corpus (the extractor + embedder workers haven't processed the captures). Re-run against `captures.content` with ILIKE before declaring no results:

```sql
SELECT id, source, repo, machine_id, captured_at, substring(content, 1, 200) AS preview
FROM captures
WHERE archived_at IS NULL
  AND content ILIKE '%' || 'the user query' || '%'
ORDER BY captured_at DESC
LIMIT 10;
```

Same synthesis rules apply — read the previews, answer naturally, don't dump rows.

If both queries return zero rows, say so plainly and suggest broadening the query.
