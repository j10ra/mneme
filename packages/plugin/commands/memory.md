---
description: Save text as a Mneme memory (LLM extracts atomic observations)
argument-hint: <text or context reference>
scope: user
allowed-tools: Bash
---

The user wants to save: $ARGUMENTS

Resolve $ARGUMENTS to the text you'll send to the slash.

**Resolution rules:**

1. **Already a paragraph or block of text** — use it verbatim.

2. **Vague reference** ("this", "the QUIC saga", "what we just figured out about embedder timeouts"). Synthesise a paragraph from the recent conversation that captures the relevant context. Keep it factual and self-contained. Don't editorialise.

3. **Empty or unresolvable** → ask the user what they want to save.

**`/memory` vs `/pin` — choose the right one:**
- **`/pin <fact>`** — single self-contained sentence, surfaces every session, never decays below 0.5 importance. Use when the user has a specific atomic fact they want to declare.
- **`/memory <paragraph>`** (this command) — paragraph or fragment, goes through the LLM extractor which pulls 0-5 atomic observations from it. Use when there's context worth processing rather than a single fact.

If the user's intent is clearly "this exact sentence matters and must surface forever," redirect to `/mneme:pin` instead.

**Invoke the slash** with the resolved text. Use a heredoc with single-quoted delimiter to preserve special characters:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" memory <<'MNEME_EOF'
<resolved text>
MNEME_EOF
```

After it runs, briefly report the resulting capture id and dedup status. Don't re-summarise the memory — the user just saw what was saved. Note: extracted observations land in `memories` ~30-90s later via the worker queue, not synchronously.
