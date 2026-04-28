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
  0.6 * (1 - (embedding <=> embed('the user query'))) +
  0.4 * ts_rank(tsv, websearch_to_tsquery('english', 'the user query'))
DESC
LIMIT 5;
```

Display the results as a tight list. For each row show:
- A short header: `<short-id> · <kind> · <repo or "no-repo"> · <created_at relative>`
- A one-line excerpt of `content` (truncate to ~120 chars, replace newlines with spaces)

Don't editorialise — the user wants the raw recall, not a synthesis.

**Fallback when memories is empty:** if the query above returns 0 rows, the `memories` table likely hasn't been populated yet for this corpus (Phase 4 worker, the extractor + embedder, hasn't processed the captures). **Re-run the recall against `captures.content` directly using ILIKE** before declaring no results:

```sql
SELECT id, source, repo, machine_id, captured_at, substring(content, 1, 200) AS preview
FROM captures
WHERE archived_at IS NULL
  AND content ILIKE '%' || 'the user query' || '%'
ORDER BY captured_at DESC
LIMIT 10;
```

Captures hold every prompt and tool call you've ever sent in a Mneme-enabled session, so this fallback finds context even before semantic indexing runs.

If both queries return zero rows, then say so plainly and suggest broadening.
