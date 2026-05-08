---
description: Mneme queue health — workers, daemons, dream, breakers
allowed-tools: Bash
---

The user wants to see Mneme queue health.

Ask the user for the **admin password** (the one set as `ADMIN_PASSWORD` on the server). Do NOT echo it back. Once you have it, run:

```bash
echo -n "<admin-password>" | bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" status
```

Pipe the password via stdin so it never lands in argv / process listings / shell history.

If the server returns 401, the admin password is wrong. If it returns 403, the bearer was a per-machine token instead of the admin password.

After the table prints, summarise it in one or two sentences: which workers ran recently, whether any daemon is stale, whether any breaker is open, whether dream has stuck claims. Don't restate the table — flag anomalies and confirm overall health.
