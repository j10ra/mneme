---
description: Resume a session from a Mneme handoff checkpoint
argument-hint: [slug, or empty for recent list]
scope: user
allowed-tools: mcp__plugin_mneme_mneme__mneme_sql
---

The user wants to resume from a Mneme handoff. Optional slug: $ARGUMENTS

## With a slug

If `$ARGUMENTS` is a slug (kebab-case, no spaces), match it exactly:

```sql
SELECT id, content, machine_id, repo, created_at,
       meta->>'handoff_slug' AS slug
FROM memories
WHERE archived_at IS NULL
  AND kind = 'summary'
  AND meta->>'handoff_slug' = '<slug>'
ORDER BY created_at DESC
LIMIT 1;
```

If found: read the full `content` out to the user verbatim (it's already a concise synthesis — no re-summarisation). Lead with one line giving the source: machine name, repo, and how long ago. Then the content.

If no match: tell the user plainly, then run the no-arg query below to show available handoffs.

## Without a slug (default)

Show the top 10 most recent handoffs for the current repo, then ask which one to load. If you don't know the repo, fall back to "all repos."

```sql
SELECT id, machine_id, repo, created_at,
       meta->>'handoff_slug' AS slug,
       substring(content, 1, 140) AS preview
FROM memories
WHERE archived_at IS NULL
  AND kind = 'summary'
  AND meta->>'handoff_slug' IS NOT NULL
  -- AND repo = '<this repo>'  (uncomment if you know the repo)
ORDER BY created_at DESC
LIMIT 10;
```

Render them as a numbered list — slug, age, machine, one-line preview. Let the user pick by number or slug. After they pick, fetch the full row and read it out as above.

If 0 rows: tell the user there are no handoffs yet. Suggest `/mneme:handoff` to create one.

## Synthesising

Don't re-summarise the handoff content — the writer already did that work. Just present it as the answer. Add a one-line lead with provenance (machine, repo, how long ago) so the user knows where it came from.
