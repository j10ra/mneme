---
description: Revoke a machine's Mneme token
argument-hint: <machine-name-or-id>
allowed-tools: Bash
---

The user wants to revoke: $ARGUMENTS

**Resolve the target to a `machine_id` (uuid) before invoking the slash.**

1. **UUID passthrough.** If `$ARGUMENTS` matches `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`, treat it as the machine_id directly.

2. **Name lookup.** Otherwise, ask the user for the admin password and run `/mneme:machines` first (or invoke the `machines` subcommand directly) to pull the list. Find the row whose `name` matches `$ARGUMENTS`. If multiple match, ask the user which one. If none, say so plainly.

3. **Confirm.** Show the user the resolved row (`name`, `machine_id`, `last_used_at`) and ask "Revoke this? (y/n)". Revocation is reversible only by re-running `/setup` on that machine, so confirm before firing.

4. **Run.** Pass `machine_id` on argv and admin password via stdin:

```bash
echo -n "<admin-password>" | bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" revoke "<machine-id>"
```

After it runs, confirm to the user how many keys were revoked.
