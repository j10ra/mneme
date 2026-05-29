---
description: Register this machine with the Mneme server — mint a token + write ~/.mneme/config.json
argument-hint: <server-url> <admin-password> [machine-name]
scope: admin
allowed-tools: Bash
---

The user wants to register this machine with Mneme. Args provided: $ARGUMENTS

If `$ARGUMENTS` is empty or missing the URL/password, **ask the user** for the
two required values before running. Don't guess.

Required:
- **server-url** — the Mneme HTTP API base URL (e.g. `https://mneme.example.com`)
- **admin-password** — the server admin password (set via `MNEME_ADMIN_PASSWORD` env on the server)

Optional:
- **machine-name** — defaults to the local hostname's first label

Run (positional form is the default; flag form is also accepted):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" setup <server-url> <admin-password> [machine-name]
```

Examples (substitute real values):

```bash
# Positional — recommended:
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" setup https://mneme.example.com s3cr3t-pw

# Flag form (also works since v1.0.19):
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" setup \
  --server-url https://mneme.example.com \
  --admin-password s3cr3t-pw \
  --name laptop
```

If `$ARGUMENTS` already contains both values in a recognised order, you can
pass it through verbatim:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" setup $ARGUMENTS
```

What the script does: POSTs `/api/auth/register` with the admin password as a
bearer token, receives a fresh `{machine_id, token}`, and writes
`~/.mneme/config.json` with mode `0600`. The token plaintext is shown once on
the server response; the DB stores only `sha256(token)`. Re-running on a
machine mints a new token (the old row stays revokable).

After it succeeds, tell the user to run `/reload-plugins` so the MCP proxy
and hooks pick up the new config.
