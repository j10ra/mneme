---
description: Unpin a Mneme memory
argument-hint: <description or memory uuid>
allowed-tools: Bash, mcp__plugin_mneme_mneme__mneme_sql
---

The user wants to unpin: $ARGUMENTS

Resolve $ARGUMENTS to a specific memory UUID before invoking the slash.

**Resolution rules:**

1. **UUID passthrough.** If $ARGUMENTS matches `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`, pass it straight through.

2. **Description.** Otherwise, search pinned memories matching the description. Use the `mneme_sql` MCP tool:

   ```sql
   SELECT id, content, kind, repo, importance, created_at
   FROM memories
   WHERE archived_at IS NULL
     AND (meta->>'pinned')::boolean = true
     AND (
       content ILIKE '%' || 'description' || '%'
       OR ts_rank(tsv, websearch_to_tsquery('english', 'description')) > 0
     )
   ORDER BY ts_rank(tsv, websearch_to_tsquery('english', 'description')) DESC,
            created_at DESC
   LIMIT 5;
   ```
   (Substitute the description text into the ILIKE and websearch_to_tsquery calls. Escape single quotes by doubling them.)

3. **Single match** → show the memory's content and ask "Unpin this? (y/n)". On yes, invoke the slash with that UUID.

4. **Multiple matches** → list them naturally to the user, ask which one(s) to unpin. Then invoke the slash for each chosen UUID.

5. **No matches** → say so plainly and suggest broadening the description or using `/mneme:pinned` to see all pins.

6. **Empty $ARGUMENTS** → suggest `/mneme:pinned` to see what's pinned, then unpin from there.

**Invoke the slash** with the resolved UUID:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" unpin "<uuid>"
```

After it runs, confirm to the user. Unpinning lets the memory's importance decay normally (still kept; just stops surfacing in every session).
