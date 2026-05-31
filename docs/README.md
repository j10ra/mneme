# Mneme docs

**What Mneme is:** cross-machine memory for AI coding assistants. One human, multiple machines, one continuous memory. Postgres + pgvector + tsvector behind a single SQL tool (`mneme_sql`) and a skill that teaches the agent how to walk the data.

**These docs are the architecture as a router.** Each file is a single topic, small enough to load on demand. Don't read sequentially — pick the doc that matches the question.

> User-facing intro and setup live in [`/README.md`](../README.md).
> Agent orientation for this codebase lives in [`/CLAUDE.md`](../CLAUDE.md). Operational pointers (routes, auth, observability, env vars, cost) live there too — these docs are for *concepts*, not *configuration*.

---

## When to read what

| If the question is … | Open … |
|---|---|
| What does Mneme actually do? | [`concepts.md`](./concepts.md) — the vocabulary |
| How does a thought become a memory? | [`capture-pipeline.md`](./capture-pipeline.md) — the hot path |
| How do memories get cleaned up? | [`workers/nap.md`](./workers/nap.md) |
| How do they get clustered into themes? | [`workers/dream.md`](./workers/dream.md) |
| What's the cross-cluster pass? | [`workers/digest.md`](./workers/digest.md) |
| What's the schema? | [`data-model.md`](./data-model.md) |
| How does the agent read memories? | [`recall.md`](./recall.md) |
| What lands in the agent at session start? | [`surface.md`](./surface.md) |
| How do non-Claude-Code clients (desktop/web/ChatGPT) connect? | [`oauth.md`](./oauth.md) — OAuth 2.1 remote MCP |

---

## The 30-second mental model

Three pieces:

- **Per-machine daemon** (`packages/daemon/`) — owns the hot path. Hooks post captures here; the daemon scrubs, dedups, runs Claude (Agent SDK — credentials resolved per-platform by the SDK; `ANTHROPIC_API_KEY` / `CLAUDE_CODE_OAUTH_TOKEN` env vars override) for atomic observations, embeds with `bge-small-en-v1.5` (384-dim) in an isolated subprocess so the ONNX session can't fragment the daemon's address space, and pushes pre-built bundles to the server. The same daemon runs **dream** every 8 hours — one daemon wins a durable lock row in `_ops.dream_runs` per window (INSERT ON CONFLICT) and clusters memories into themes. Candidates stream over NDJSON.
- **Server** (`packages/server/`) — pure data plane. One Bun + Hono process. Receives bundles via `/api/bundle`, runs **nap** (4h, decay + auto-archive + relate + rule-based supersede) and the opt-in **digest** worker (every 24h, cross-cluster merge + supersede), exposes `/mcp` so any AI agent on any harness can read.
- **Postgres** — the single source of truth. Two data tables (`captures`, `memories`) plus an `_ops` schema for traces / spans / logs / api_keys.

```
hook → daemon /capture → outbox → /api/bundle → memories
                                                  │
                                                  ├─ 4h ─▶ nap     (server, SQL)
                                                  ├─ 8h ─▶ dream   (daemon, Sonnet)
                                                  └─ 24h ─▶ digest (server, opt-in)

_ops.{spans,traces,logs} ── 24h ─▶ prune (server, telemetry retention)
```

Agents read via `/mcp` (the bundled stdio proxy). Sessions start with a markdown surface from `/api/session/start`.

---

## Reading order, first time

1. [`concepts.md`](./concepts.md) — the vocabulary
2. [`capture-pipeline.md`](./capture-pipeline.md) — the hot path end to end
3. [`workers/nap.md`](./workers/nap.md), [`workers/dream.md`](./workers/dream.md), [`workers/digest.md`](./workers/digest.md) — the three brain workers
4. [`workers/prune.md`](./workers/prune.md) — telemetry retention (`_ops.*` cleanup)
5. [`recall.md`](./recall.md) and [`surface.md`](./surface.md) — the read paths

That's it. Anything operational — routes, auth, observability, env vars, cost — read the code via the pointers in [`/CLAUDE.md`](../CLAUDE.md).
