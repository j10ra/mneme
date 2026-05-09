---
description: Rename THIS machine in Mneme (in place, no token reissue)
argument-hint: <new-name>
scope: user
allowed-tools: Bash
---

Rename this machine to: $ARGUMENTS

This is a self-rename: it can only rename the machine the slash is run from. Renaming another machine isn't supported by design — that would leave the other machine's local `~/.mneme/config.json` stale.

1. **Validate.** `$ARGUMENTS` is the new name. If empty or only whitespace, ask the user. Names get lowercased and `[^a-z0-9-]` collapsed to `-` server-side, so a name like `Qube Laptop` becomes `qube-laptop`. Surface that to the user before running if it differs.

2. **Confirm.** Show the user `<current-name> → <new-name>` and ask "Rename? (y/n)". Pull the current name from `cfg.machine.name` in `~/.mneme/config.json` (read it, don't ask).

3. **Run.** No admin password needed — the per-machine token in `~/.mneme/config.json` is the identity. Server stamps the rename target from the bearer:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" rename "<new-name>"
```

The slash hits `POST /api/auth/rename`, the server updates `_ops.api_keys.name` for the calling token's `machine_id`, and the slash writes the new label back into `~/.mneme/config.json` so server and local stay in sync. Same `machine_id`, same token, same captures and memories — only the label changes.

After it runs, confirm the new name to the user.
