---
description: Mneme queue health — workers, daemons, dream, breakers
scope: user
allowed-tools: Bash
---

The user wants to see Mneme queue health. Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" status
```

The slash uses the per-machine bearer from `~/.mneme/config.json` — no admin password needed. If the server returns 401, the per-machine token is invalid; suggest re-running `/mneme:setup`.

After the table prints, summarise it in one or two sentences: which workers ran recently, whether any daemon is stale, whether any breaker is open, whether dream has stuck claims. Don't restate the table — flag anomalies and confirm overall health.
