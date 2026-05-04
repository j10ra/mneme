---
description: Pin a Mneme memory so it surfaces in every session
argument-hint: <fact text or memory uuid>
allowed-tools: Bash, mcp__plugin_mneme_mneme__mneme_sql
---

The user wants to pin: $ARGUMENTS

Resolve $ARGUMENTS to the **exact text** to save before invoking the slash. The slash is dumb (just saves whatever you send); you are smart.

**Resolution rules:**

1. **UUID passthrough.** If $ARGUMENTS matches `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`, pass it straight through — that's the existing-memory actuation path.

2. **Already a clean sentence.** If $ARGUMENTS is a single self-contained third-person factual sentence (no "we", no "the user", no vague pronouns), use it verbatim.

3. **Vague reference** ("this", "that thing", "what we just decided", "the homelab finding"). Infer the actual fact from the recent conversation. Phrase as ONE self-contained sentence: third-person, present tense, factual style. Example transformations:
   - User: "pin this homelab finding" → You synthesise: "Setting OLLAMA_NUM_PARALLEL=1 on a 4-core CPU homelab box yields 11.6 tok/s for 3B inference; the previous default 4 split llama.cpp's thread budget across parallel slots."
   - User: "pin my preference about LLMs" → You synthesise: "Boss prefers self-hosted homelab inference over paid LLM APIs to avoid 24/7 rate limits during sustained worker traffic."

4. **Empty or unresolvable.** If $ARGUMENTS is empty or you can't tell what to pin from context, ask the user instead of guessing.

**Confirmation:** before invoking the slash, show the user the exact sentence you're about to pin and ask "Pin this? (y/n)". Pinning is high-commitment (surfaces forever) so silent guessing is bad.

**Once confirmed**, invoke the slash with the resolved text (NOT $ARGUMENTS literally — pass the synthesised sentence). Pipe via stdin if the text could contain shell metacharacters; or pass as argv if it's safe:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" pin "<resolved text or uuid>"
```

After it runs, briefly report: the memory id, whether it was newly created or re-pinned. Don't re-summarise the content — the user just confirmed it.
