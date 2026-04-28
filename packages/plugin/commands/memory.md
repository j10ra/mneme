---
description: Save text as a Mneme memory
argument-hint: <text to remember>
allowed-tools: Bash
---

The user wants to save the following as a Mneme memory:

$ARGUMENTS

To save it, run this Bash command, piping the exact text above into the slash dispatcher's stdin (use a heredoc with single-quoted delimiter to preserve any special characters in the text):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" memory <<'MNEME_EOF'
$ARGUMENTS
MNEME_EOF
```

After it runs, briefly report the resulting capture id and dedup status to the user. Don't summarise or rephrase the memory — just confirm it was saved.
