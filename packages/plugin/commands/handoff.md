---
description: Save a session checkpoint to Mneme so another machine can resume it
argument-hint: [optional slug hint]
scope: user
allowed-tools: Bash
---

The user wants to checkpoint this session for cross-machine handoff. Optional slug hint: $ARGUMENTS

## What to write

Synthesise the current session into a tight, factual summary that future-you (possibly on another machine) can read to pick up where the user left off. 4-8 sentences, third-person, present tense.

Lead with **what's in flight**: the concrete work the user is doing right now (file paths, in-progress decisions, what's been tried, what's blocked). Then **what was decided**: any architectural choices, picks, or constraints settled this session. Then **what's next**: the obvious next step or open question.

Skip: pleasantries, narration of the conversation flow ("the user asked me…"), and anything already in the codebase or git history.

## Slug

Pick a 2-4 word kebab-case slug that names the session's topic. Examples:

- `dream-streaming-refactor`
- `config-audit-cleanup`
- `wallet-tdlib-investigation`
- `homelab-vnc-hardening`

Rules:
- Lowercase ASCII letters + digits + hyphens
- 2-6 segments, 4-60 chars total
- No date or machine name — those are already in `created_at` and `machine_id` on the row

If the user passed a slug hint in `$ARGUMENTS`, prefer it (adjust to match the rules if needed). Otherwise pick one yourself from the session's topic.

## Invoke

Pass the slug as arg, the synthesis on stdin via heredoc:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/claude/slash.ts" handoff <slug> <<'MNEME_EOF'
<the synthesis>
MNEME_EOF
```

After it runs, briefly confirm with the slug + short id. Tell the user that on another machine they can resume with `/mneme:resume <slug>` (or just `/mneme:resume` to see the most recent handoffs).
