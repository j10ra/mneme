---
description: List all machines registered with the Mneme server
scope: admin
allowed-tools: Bash
---

The user wants to see registered machines. Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" machines
```

The slash resolves the admin password via env → encrypted config → stdin (no prompt needed for operator machines that ran `/mneme:setup`).

If the command exits with `admin password required`, ask the user for the **admin password** (the one set as `ADMIN_PASSWORD` on the server). Do NOT echo it back. Re-run with it piped via stdin: `echo -n "<pw>" | bun ".../slash.ts" machines`.

If the server returns 401, the stored password is wrong. If it returns 403, the bearer was a per-machine token instead of admin.

After the listing prints, summarise it naturally for the user (which machines are active, when they were last used, anything revoked).
