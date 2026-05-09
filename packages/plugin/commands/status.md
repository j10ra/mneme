---
description: Mneme queue health — workers, daemons, dream, breakers
scope: admin
allowed-tools: Bash
---

The user wants to see Mneme queue health. Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" status
```

The slash resolves the admin password via this ladder (no prompt needed for operator machines):
1. `MNEME_ADMIN_PASSWORD` env var
2. encrypted secret in `~/.mneme/config.json` (set by `/mneme:setup`)
3. stdin (only if neither of the above is present)

If the command exits with `admin password required` (rung 3 with nothing piped), ask the user for the **admin password** (the one set as `ADMIN_PASSWORD` on the server) — do NOT echo it back — and re-run with it piped via stdin: `echo -n "<pw>" | bun ".../slash.ts" status`.

If the server returns 401, the stored password is wrong (re-run `/mneme:setup`). If it returns 403, the bearer was a per-machine token instead of admin.

After the table prints, summarise it in one or two sentences: which workers ran recently, whether any daemon is stale, whether any breaker is open, whether dream has stuck claims. Don't restate the table — flag anomalies and confirm overall health.
