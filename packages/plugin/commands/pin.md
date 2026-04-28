---
description: Pin a Mneme memory so it surfaces in every session
argument-hint: <memory-id>
allowed-tools: Bash
---

Pin the Mneme memory with id: $ARGUMENTS

Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" pin "$ARGUMENTS"
```

After it runs, confirm to the user that the memory was pinned. Pinned memories surface in the SessionStart pointer list (§6.6 Surface) and stay above the importance-decay floor.
