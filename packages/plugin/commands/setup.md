---
description: Set up Mneme on this machine — write ~/.mneme/config.json
argument-hint: <server-url> <api-key> [machine-name]
allowed-tools: Bash
---

The user wants to set up Mneme on this machine. Args: $ARGUMENTS

Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" setup $ARGUMENTS
```

The script writes `~/.mneme/config.json` with `0600` permissions. It generates a `machine.id` (uuid) on first run; if a config already exists, the existing machine.id is preserved.

After it runs, tell the user to run `/reload-plugins` so the MCP proxy and hooks pick up the new config.
