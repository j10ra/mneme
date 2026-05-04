---
description: List currently pinned Mneme memories
argument-hint: [optional scope filter]
allowed-tools: mcp__plugin_mneme_mneme__mneme_sql
---

Show the user what's currently pinned in Mneme. Optional scope hint: $ARGUMENTS

Use the `mneme.sql` MCP tool to fetch all pinned memories. If $ARGUMENTS looks like a repo (contains `/`), filter by `repo`. Otherwise list everything pinned.

```sql
SELECT id, content, kind, repo, importance, created_at
FROM memories
WHERE archived_at IS NULL
  AND (meta->>'pinned')::boolean = true
  -- + optional WHERE repo = '...' if $ARGUMENTS narrows scope
ORDER BY importance DESC, created_at DESC
LIMIT 50;
```

Render as a tight readable list. For each pinned memory, show:
- One-line excerpt of `content` (truncate to ~120 chars, replace newlines with spaces)
- A small footer: `(<kind> · <repo or "no-repo"> · imp <importance>)`

Don't re-synthesise — the user wants to see exactly what they pinned, in their own words.

If there are zero pins, say so plainly and suggest `/mneme:pin <fact>` to declare one.

If there are many (say >20), include a count line at the top so the user knows the total.
