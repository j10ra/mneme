---
description: List all machines registered with the Mneme server
scope: user
allowed-tools: Bash
---

The user wants to see registered machines. Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" machines
```

The slash uses the per-machine bearer from `~/.mneme/config.json` — no admin password needed. If the server returns 401, the per-machine token is invalid; suggest re-running `/mneme:setup`.

After the listing prints, summarise it naturally for the user (which machines are active, when they were last used, anything revoked).
