---
description: Summarise recent Mneme memories
argument-hint: [scope hint, optional]
allowed-tools: mcp__plugin_mneme_mneme__mneme_sql
---

The user wants a summary of recent Mneme memories. Optional scope hint: $ARGUMENTS

Use the `mneme_sql` MCP tool to fetch recent memories.

If $ARGUMENTS looks like a repo name (contains `/`) or matches a known scope, filter by `repo`. If it looks like a topic word, also try matching against `topics` array or `tsv`. Otherwise just take the most recent.

Pattern:

```sql
SELECT id, content, kind, repo, captured_at := created_at
FROM memories
WHERE archived_at IS NULL
  AND (meta->>'shadow_of') IS NULL
  AND created_at > now() - interval '7 days'
  -- + scope filters as appropriate
ORDER BY created_at DESC
LIMIT 30;
```

Then synthesise a tight summary, under 200 words. Lead with one line saying what's covered (count, date span). Then bullet up to 5 themes or notable items. Don't list every memory verbatim.

If you find fewer than 3 memories, say so plainly — there's nothing meaningful to summarise.

(Persistent cluster summaries via the dream worker land in Phase 8; this slash command is read-only synthesis.)
