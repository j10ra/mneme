---
description: Mark a Mneme memory as superseded by a newer one that replaces it
argument-hint: <old: description or uuid> | <new: description or uuid>
scope: user
allowed-tools: Bash, mcp__plugin_mneme_mneme__mneme_sql
---

The user wants to supersede a memory: $ARGUMENTS

Supersede links an OLD memory to the NEW memory that replaces it. The old memory stays queryable but is rank-penalized in recall (×0.3) and dropped from the surface; the new one is unaffected. Both memories must already exist — supersede does not create memories.

**Resolve $ARGUMENTS to two memory UUIDs — the old (superseded) one and the new (replacement) one — before invoking the slash.**

1. **Identify the two memories.** $ARGUMENTS names two memories. If it is ambiguous which is the old one and which is the replacement, ask the user.

2. **UUID passthrough.** If a part matches `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`, use it directly.

3. **Description.** Otherwise search live memories for each part with the `mneme_sql` MCP tool:

   ```sql
   SELECT id, content, kind, repo, importance, created_at
   FROM memories
   WHERE archived_at IS NULL
     AND (
       content ILIKE '%' || 'description' || '%'
       OR ts_rank(tsv, websearch_to_tsquery('english', 'description')) > 0
     )
   ORDER BY ts_rank(tsv, websearch_to_tsquery('english', 'description')) DESC,
            created_at DESC
   LIMIT 5;
   ```
   (Substitute the description text. Escape single quotes by doubling them.)

4. **Show both resolved memories' content and confirm** with the user before invoking the slash. If either side has multiple candidates or none, list them / say so and ask.

**Confirmation is required** — supersede changes what recall surfaces.

**Invoke the slash** with the two resolved UUIDs (old first, then new):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" supersede "<old-uuid>" "<new-uuid>"
```

To reverse a supersede (rare), use the unsupersede subcommand directly:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" unsupersede "<old-uuid>"
```

After it runs, briefly confirm. Don't re-summarise the content — the user just confirmed it.
