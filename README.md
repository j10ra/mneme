# Mneme

> Greek muse of memory. A personal, cross-machine, cross-harness, cross-AI memory layer for coding sessions.

Captures Claude Code (and any other harness via HTTP), distils into structured memories, surfaces relevant context at the start of every session, and clusters related memories nightly. Postgres + pgvector + tsvector as the single source of truth, fronted by a one-tool MCP server.

For the full design and rationale see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Why

- **claude-mem** captures coding sessions richly, but everything stays on the laptop.
- **OB1** is cross-AI via MCP, but has no hook surface (captures are manual).
- Switching machine, harness, or model loses context.

Mneme: hooks for write, MCP + skill for read, Supabase as the shared source of truth.

---

## Architecture in 30 seconds

```
hooks ─┐
slash ─┼─→ POST /api/capture ─→ captures (raw, immutable)
HTTP  ─┘                            │
                                    ▼
                          extract worker (LLM)
                                    │
                                    ▼
                            memories (structured)
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
       embed (pgvector)        nap (decay,           dream (cluster,
                                shadow, relate)         distil)
                                    │
                                    ▼
                  POST /api/session/start  ── SessionStart context
                  POST /mcp (mneme.sql)    ── on-demand recall via skill
```

Three tables (`captures`, `memories`, `_ops.api_keys`). One MCP tool (`mneme.sql`). Workers are queue-driven (extract, embed) or scheduler-driven (nap, dream, keepalive).

---

## Setup

Server runs on Railway, DB on Supabase, LLM/embedder behind a Cloudflare Tunnel pointing at homelab Ollama + TEI. Any OpenAI-compatible endpoint drops in.

### Server

1. `bun install`
2. Set env (`.env` for local, Railway dashboard for prod):
   ```
   DATABASE_URL=postgresql://...
   MNEME_READER_DATABASE_URL=postgresql://...   # mneme_reader role for /mcp
   LLM_PROVIDER=local
   LLM_URL=https://your-llm-endpoint
   LLM_BEARER=...
   LLM_MODEL=qwen2.5:3b-instruct-q4_K_M
   EMBEDDER_PROVIDER=local
   EMBEDDER_URL=https://your-embedder-endpoint
   EMBEDDER_BEARER=...
   EMBEDDER_MODEL=BAAI/bge-large-en-v1.5
   ADMIN_PASSWORD=...                            # roots all auth
   ```
3. `bun run migrate` (applies SQL in `migrations/`)
4. `bun run dev` (or deploy via Procfile)

### Plugin (per machine)

In Claude Code, add the marketplace and install the plugin:

```
/plugin marketplace add j10ra/mneme
/plugin install mneme@j10ra-mneme
```

Then register this machine with your server:

```
/setup <server-url> <admin-password> [machine-name]
/reload-plugins
```

`/setup` POSTs `/api/auth/register`, gets back a per-machine token, writes it to `~/.mneme/config.json` (mode 0600). Token plaintext is shown once; the DB stores `sha256(token)` only.

To pull plugin updates later:

```
/plugin update mneme
/reload-plugins
```

---

## Daily use

| Slash | Effect |
|---|---|
| `/setup <url> <admin-pw> [name]` | Register this machine, mint a token |
| `/memory <text>`                  | Drop a manual capture |
| `/pin <text-or-uuid>`             | Pin a fact (always surfaces) or pin an existing memory by id |
| `/unpin <description-or-uuid>`    | Unpin |
| `/pinned`                         | Show what's pinned |
| `/recall <query>`                 | Hybrid + recency search via the skill |
| `/summarise`                      | Wrap-up the current session as a memory |
| `/mneme:machines`                 | List registered machines (admin pw via stdin) |
| `/mneme:revoke <name-or-id>`      | Revoke a machine's token |

Hooks fire automatically: `SessionStart` injects relevant context, `PostToolUse` / `UserPromptSubmit` capture interesting events.

---

## What's in this repo

- `packages/server/`  — Hono + Bun server, workers (extract, embed, nap, dream, keepalive)
- `packages/core/`    — auth, logger, trace store, route + fn instrumentation
- `packages/plugin/`  — Claude Code plugin (hooks, slashes, MCP proxy, skill)
- `migrations/`       — sequential SQL migrations
- `ARCHITECTURE.md`   — design doc

---

## Status

Personal tool. Single user. Three machines. Not multi-tenant. Not team memory.

Phase 0–6.0 shipped: capture → extract → embed → nap (decay/shadow/relate/retry) → dream (cluster/distil). See `ARCHITECTURE.md` §12 for the build phases.
