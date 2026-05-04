---
description: Register this machine with the Mneme server — mint a token + write ~/.mneme/config.json
argument-hint: <server-url> <admin-password> [machine-name]
allowed-tools: Bash
---

The user wants to register this machine with Mneme. Args: $ARGUMENTS

Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" setup $ARGUMENTS
```

The script POSTs `/api/auth/register` with the admin password as bearer, receives a fresh `{machine_id, token}`, and writes `~/.mneme/config.json` with `0600` permissions. The token plaintext is shown once on the server side; the DB stores `sha256(token)` only. Re-running this on a machine mints a new token (the old row stays revokable).

After it runs, tell the user to run `/reload-plugins` so the MCP proxy and hooks pick up the new config.
