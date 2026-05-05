---
description: Rename a Mneme machine in place (no token reissue, no bifurcated history)
argument-hint: <machine-name-or-id> <new-name>
allowed-tools: Bash, mcp__plugin_mneme_mneme__mneme_sql
---

The user wants to rename a registered machine. Arguments: `$ARGUMENTS` — first token is the target (current name or UUID), second is the new name.

**Resolve the target to a `machine_id` (uuid) before invoking the slash.**

1. **Parse args.** Split `$ARGUMENTS` on whitespace. First token = target, second token (and onward, joined with `-`) = new name. If either is missing, ask the user.

2. **UUID passthrough.** If the target matches `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`, use it directly.

3. **Name lookup.** Otherwise query `mneme.sql` against the `machines` view: `SELECT machine_id, name, last_used_at FROM machines WHERE name = '<target>' AND revoked_at IS NULL` (or `name ILIKE '%<target>%'` if no exact hit). If multiple match, ask which one. If none, say so plainly.

4. **Confirm.** Show the user `<old-name> → <new-name>` (and `machine_id`, `last_used_at`) and ask "Rename? (y/n)". This is in-place: same `machine_id`, same token, same captures/memories — only the label changes.

5. **Run.** Pass `machine_id` and the new name on argv, admin password on stdin:

```bash
echo -n "<admin-password>" | bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" rename "<machine-id>" "<new-name>"
```

After it runs, confirm the new name to the user. The `machines` view will reflect the change immediately on the next query.
