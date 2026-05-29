---
description: Open the local Mneme dashboard in a browser
scope: user
allowed-tools: Bash
---

The user wants to open the local Mneme dashboard. Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" dashboard
```

The slash prints the daemon's loopback URL (`http://127.0.0.1:<port>/dashboard`) and best-effort-opens it via `open` (macOS) / `xdg-open` (Linux) / `start` (Windows). If the auto-open doesn't work (SSH, headless, etc.), the printed URL is the fallback.

Confirm to the user: tell them the URL was opened (or printed) and remind them the dashboard is local-only — anyone needing to view it must be on this machine.
