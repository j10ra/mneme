---
description: List all machines registered with the Mneme server
allowed-tools: Bash
---

The user wants to see registered machines.

Ask the user for the **admin password** (the one set as `ADMIN_PASSWORD` on the server). Do NOT echo it back. Once you have it, run:

```bash
echo -n "<admin-password>" | bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" machines
```

Pipe the password via stdin so it never lands in argv / process listings / shell history.

If the server returns 401, the admin password is wrong. If it returns 403, the bearer was a per-machine token instead of the admin password.

After the listing prints, summarise it naturally for the user (which machines are active, when they were last used, anything revoked).
