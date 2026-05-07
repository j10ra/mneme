---
description: List currently pinned Mneme memories
argument-hint: [optional scope filter]
allowed-tools: mcp__plugin_mneme_mneme__mneme_sql
---

Show the user what's currently pinned in Mneme. Optional scope hint: $ARGUMENTS

Use the `mneme_sql` MCP tool to fetch all pinned memories. If $ARGUMENTS looks like a repo (contains `/`), filter by `repo`. Otherwise list everything pinned.

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
- The **full UUID on its own line** so the user can copy-paste straight into `/mneme:unpin <uuid>`. Format the id in backticks for easy click-to-copy in monospace renderers.
- One-line excerpt of `content` (truncate to ~120 chars, replace newlines with spaces)
- A small footer: `(<kind> · <repo or "no-repo"> · imp <importance>)`

Example shape:
```
`37d53619-88ad-4b4e-958f-3363845c4d90`
Mneme slash commands follow an agent-resolution pattern…
(note · github.com/j10ra/mneme · imp 1.00)
```

Don't re-synthesise — the user wants to see exactly what they pinned, in their own words.

End the list with a one-line tip: "Unpin with `/mneme:unpin <uuid>` or `/mneme:unpin <description>`."

If there are zero pins, say so plainly and suggest `/mneme:pin <fact>` to declare one.

If there are many (say >20), include a count line at the top so the user knows the total.
