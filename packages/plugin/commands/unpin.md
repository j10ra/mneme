---
description: Unpin a Mneme memory
argument-hint: <memory-id>
allowed-tools: Bash
---

Unpin the Mneme memory with id: $ARGUMENTS

Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" unpin "$ARGUMENTS"
```

After it runs, confirm to the user. Unpinning lets the memory's importance decay normally over time.
