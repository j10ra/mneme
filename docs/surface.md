# Surface

The other read path: a compact markdown digest delivered to the agent at SessionStart, without any tool call. **Five sections, ≤ 20 items total, cross-machine.**

> Reads for context: [`concepts.md`](./concepts.md), [`workers/nap.md`](./workers/nap.md), [`workers/dream.md`](./workers/dream.md).
> Sibling read path: [`recall.md`](./recall.md).
> Aggregator file: [`/packages/server/src/services/surface.ts`](../packages/server/src/services/surface.ts).

---

## Two passes on every SessionStart

1. **Register** — auto-add `cwd` to `~/.mneme/config.json` `projects[]` if it's not blacklisted and not already there. Idempotent.
2. **Surface** — discover repos under `cwd`, fetch the surface from the server, return it as `hookSpecificOutput.additionalContext` for Claude Code to inject into the agent.

Non-`SessionStart` events (UserPromptSubmit, PostToolUse, Stop, PreCompact) skip pass 1 but enforce the allowlist gate: anything outside known projects is treated as ghost work and rejected.

---

## `cwd` → repos[] discovery

`discoverRepos(cwd)` (in [`/packages/plugin/scripts/scope.ts`](../packages/plugin/scripts/scope.ts)) walks one level deep and returns the union of:

| Source | Rule |
|---|---|
| **cwd self** | always include `canonicalRepo(cwd)` — even when it falls back to `dir:<basename>` |
| **Immediate children** with `.git` | canonical URL only — skip `dir:*` |
| **`wt/*` worktrees** | walks `<cwd>/wt/*/`, each one's canonical (de-duped against parent) |

Including the `dir:*` fallback for the cwd itself matters: captures from a session opened at a non-git workspace root inherit `repo='dir:<basename>'`. Without including it in the surface query, those captures would be invisible.

---

## Five sections, in order

The hook POSTs `{ machine_id, repos: string[], session_id }` to `/api/session/start`. The aggregator builds these five sections in parallel queries against `memories WHERE repo = ANY(repos)`. Every section also filters out `meta.superseded_by IS NOT NULL` — the surface is curated for the *current* version of every fact.

Importance-ordered sections rank by `(importance + RECALL_RANKING_COEF * ln(1 + recall_weight))` rather than raw importance, so use-driven memories drift up alongside the importance signal.

| Section | Filter | Cap |
|---|---|---|
| **Pinned** | `(meta->>'pinned')::boolean = true AND (repo = ANY(repos) OR repo IS NULL)`, ORDER BY (importance + LTP-boost) DESC, created_at DESC | 5 |
| **Rules** | `kind IN ('preference','constraint') AND importance >= 0.7 AND (repo = ANY(repos) OR repo IS NULL)`, ORDER BY (importance + LTP-boost) DESC, created_at DESC | 3 |
| **Themes** | `kind = 'cluster' AND repo = ANY(repos)`, ORDER BY (importance + LTP-boost) DESC, created_at DESC. Renders `meta.cluster_title`. | 3 |
| **Recent** | `repo = ANY(repos) AND kind IN ('decision','feature','bugfix','discovery') AND importance >= 0.6 AND created_at > now() - interval '14 days'`, ORDER BY (importance + LTP-boost) DESC, created_at DESC | 6 |
| **Sessions** | `repo = ANY(repos) AND kind = 'summary'`, ORDER BY created_at DESC | 3 |

Total budget: 5 + 3 + 3 + 6 + 3 = **20 items**.

The aggregator also returns:
- **`supersededCount`** — total superseded rows in the repo set, rendered in the surface footer so the agent can pivot to historical-context queries when needed.
- **`delta`** — captures + memories created on `repo = ANY(repos)` since the most-recent `kind='summary'` memory on those repos, rendered as "Since last session: X captures, Y memories".

---

## Cross-machine privacy

All section queries gate on `(private = false OR machine_id = $caller_machine_id)`, where `$caller_machine_id` is server-stamped from the bearer token. Admin tokens substitute `null`, which only matches public rows.

**No machine filter on the public-row matches** — this is how cross-machine works. A memory written on machine A with `repo='github.com/acme/web'` surfaces in any session on machine B that calls `discoverRepos` and gets `github.com/acme/web` in its array. The repo is the cross-machine join key; the union across machines is implicit. Private rows stay scoped to their origin machine.

This is also the **only path** through which a machine can recall its own private memories — the MCP `mneme_sql` tool is public-only by RLS (`mneme_reader` Postgres role with `USING (private = false)`). Per-machine private recall via MCP is deferred ([#13](https://github.com/j10ra/mneme/issues/13)).

---

## What the rendered surface looks like

_IDs below are shortened to 8 chars for readability. Live surface emits full UUIDs (e.g. `a3f29c7d-1234-5678-9012-abcdef123456`)._

```markdown
# Mneme · workspace (4 repos) · across 2 machines
_Since last session (2h ago): 24 captures, 11 memories · 3 superseded all-time_

## Pinned (2 of 7)
- [a3f29c7d] ⚖️ 0.90 Use the daemon's Claude SDK for extract; OpenRouter only on the digest path
- [ee15b220] 💬 0.85 Address user as Boss, no AI attribution in commits

## Rules (2 of 4)
- [b8c1f4e2] 🚧 The hook performs a hard-blacklist check on cwd before any HTTP call
- [c1d2e3f4] 💬 The user prefers terse responses, no preamble

## Themes (3 of 16)
- [5b1ed144] 🧩 **Trace forwarding** — Daemon batches spans every 5s/100 items to /api/ingest/spans; covers stage ticks, Claude SDK calls, scheduler jobs.

## Recent (last 14 days)
- [c4f2a1b9] 5d ago · ⚖️ Two-phase migration: Phase 1 additive with rollback tag, Phase 2 cleanup gated on validation
- [d4e5f6a7] 3d ago · 🔴 Pin actuation needs UUID validation + try/catch wrap

## Recent sessions
- [f0a1b2c3] just now · 🎯 Three changes shipped: hook filter, prompt tightening, token cap
- [a1b2c3d4] 1h ago · 🎯 v1.0.83 dashboard skeleton + status panel + CI build pipeline working
```

**Full UUID** on every surface row. The agent pivots to the full memory in one query: `WHERE id = '<uuid>'`. The cost (~10 tokens per row) is paid on the LLM channel only — the user-visible status banner summarises counts and never renders row ids.

**Glyph map:** 🔴 bugfix · 🟣 feature · ⚖️ decision · 🔵 discovery · 💬 preference · 🚧 constraint · 🚨 security_alert · 📎 reference · 🎯 summary · 🧩 cluster · 🧠 claude_memory · 📝 note.

Importance is shown only on **Pinned** (where the 0.5–1.0 range carries information); other sections already pass an aggregator-side importance threshold.

---

## Output envelope (Claude Code-specific)

The hook wraps the markdown in:

```json
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<the markdown>"}}
```

Claude Code only injects context when this envelope is present — raw markdown stdout is silently dropped. Multiple plugins' envelopes are merged into a `hook_additional_context` attachment with a `content[]` array; the **agent receives every plugin's `additionalContext`** in the conversation transcript.

---

## Generic callers (non-Claude-Code)

`/api/session/start` is harness-agnostic. Any caller posts `repos: string[]` and gets back the structured payload + rendered markdown:

- **Claude Code** — SessionStart hook (this section).
- **Codex / Cursor / OpenCode** ([#6](https://github.com/j10ra/mneme/issues/6)) — first `mneme_sql` response from MCP prepends `rendered` as a preamble (no SessionStart hook concept in those harnesses).
- **CLI** (future) — `mneme surface` prints `rendered` to terminal.
- **Any HTTP client** — same payload, returns the same JSON.

---

## See also

- [`recall.md`](./recall.md) — the explicit-query read path.
- [`workers/dream.md`](./workers/dream.md) — produces the `kind='cluster'` rows that fill the Themes section.
- [`/packages/server/src/routes/session.ts`](../packages/server/src/routes/session.ts) — the `/api/session/start` handler.
