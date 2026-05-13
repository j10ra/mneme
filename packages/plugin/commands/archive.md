---
description: Archive a Mneme memory so it stops surfacing anywhere
argument-hint: <description or memory uuid>
scope: user
allowed-tools: Bash, mcp__plugin_mneme_mneme__mneme_sql
---

The user wants to archive: $ARGUMENTS

Resolve $ARGUMENTS to a specific memory UUID before invoking the slash. Archiving sets `archived_at` and removes the memory from every recall path (search, surface, dashboard); the row is kept for provenance but is otherwise gone.

**Resolution rules:**

1. **UUID passthrough.** If $ARGUMENTS matches `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`, pass it straight through.

2. **Description.** Otherwise, search live memories matching the description. Use the `mneme_sql` MCP tool:

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
   (Substitute the description text into the ILIKE and websearch_to_tsquery calls. Escape single quotes by doubling them.)

3. **Single match** → show the memory's content and ask "Archive this? (y/n)". On yes, invoke the slash with that UUID.

4. **Multiple matches** → list them naturally to the user, ask which one(s) to archive. Then invoke the slash for each chosen UUID.

5. **No matches** → say so plainly and suggest broadening the description.

6. **Empty $ARGUMENTS** → ask the user what to archive; don't guess.

**Confirmation is required** before invoking the slash. Archiving is high-commitment (kills the memory's visibility everywhere) so silent guessing is bad.

**Invoke the slash** with the resolved UUID:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" archive "<uuid>"
```

To reverse an archive (rare), use the unarchive subcommand directly:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" unarchive "<uuid>"
```

After it runs, briefly confirm. Don't re-summarise the content — the user just confirmed it.
