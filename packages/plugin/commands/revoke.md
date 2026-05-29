---
description: Revoke a machine's Mneme token
argument-hint: <machine-name-or-id>
scope: admin
allowed-tools: Bash
---

The user wants to revoke: $ARGUMENTS

**Resolve the target to a `machine_id` (uuid) before invoking the slash.**

1. **UUID passthrough.** If `$ARGUMENTS` matches `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`, treat it as the machine_id directly.

2. **Name lookup.** Otherwise, run `/mneme:machines` first (or invoke the `machines` subcommand directly) to pull the list. Find the row whose `name` matches `$ARGUMENTS`. If multiple match, ask the user which one. If none, say so plainly.

3. **Confirm.** Show the user the resolved row (`name`, `machine_id`, `last_used_at`) and ask "Revoke this? (y/n)". Revocation is reversible only by re-running `/setup` on that machine, so confirm before firing.

4. **Run.** The slash resolves the admin password via env → encrypted config → stdin ladder, so on operator machines no prompt is needed:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" revoke "<machine-id>"
```

If it exits with `admin password required`, ask the user for it (do NOT echo) and re-run with it piped: `echo -n "<pw>" | bun ".../slash.ts" revoke "<machine-id>"`.

After it runs, confirm to the user how many keys were revoked.
