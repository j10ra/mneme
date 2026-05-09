---
description: List every Mneme slash command and what it does
scope: user
allowed-tools: Bash
---

The user wants a quick reminder of available Mneme slash commands. Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" help
```

The output is a markdown table grouped by scope (User / Admin). It auto-updates as new slashes land — each `commands/*.md` declares its own `description` + `scope` in frontmatter, and the help script walks the directory.

After it prints, don't add commentary unless the user asks a follow-up. The table is the answer.
