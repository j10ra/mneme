# Mneme — orientation for agents

Greek muse of memory. Personal cross-machine memory layer for one user, three machines.

**This file is a router.** Don't expect answers here — expect pointers to where the answer lives. Pull canonical material on demand.

---

## Where to read

### Concepts (what Mneme *is*)

| Question | Open |
|---|---|
| Understand the system at all | [`docs/README.md`](./docs/README.md) |
| Look up a term | [`docs/concepts.md`](./docs/concepts.md) |
| Trace the hot path (hook → daemon → server) | [`docs/capture-pipeline.md`](./docs/capture-pipeline.md) |
| Reason about how memories get refined | [`docs/workers/nap.md`](./docs/workers/nap.md), [`docs/workers/dream.md`](./docs/workers/dream.md), [`docs/workers/digest.md`](./docs/workers/digest.md), [`docs/workers/prune.md`](./docs/workers/prune.md) |
| Read the schema or design a query | [`docs/data-model.md`](./docs/data-model.md), [`packages/plugin/skills/using-mneme/SKILL.md`](./packages/plugin/skills/using-mneme/SKILL.md) |
| How agents read | [`docs/recall.md`](./docs/recall.md), [`docs/surface.md`](./docs/surface.md) |
| Connect a non-Claude-Code MCP client (desktop/web/mobile, ChatGPT) | [`docs/oauth.md`](./docs/oauth.md) |
| Code style, formatting, naming, lint enforcement | [`docs/conventions.md`](./docs/conventions.md) |

### Operations (the code is the doc)

| Question | Open |
|---|---|
| Find an endpoint | [`packages/server/src/routes/`](./packages/server/src/routes/), [`packages/daemon/src/routes/`](./packages/daemon/src/routes/) |
| Map a package | `ls packages/` then [`packages/<pkg>/src/index.ts`](./packages/) |
| Auth, scope checks, server-stamped identity | [`packages/core/src/auth.ts`](./packages/core/src/auth.ts) |
| Scrubber patterns | [`packages/shared/src/scrub.ts`](./packages/shared/src/scrub.ts) |
| Traces / spans / logs | [`packages/core/src/{logger,trace-store,mneme-route,mneme-fn}.ts`](./packages/core/src/) |
| Daemon-side trace forwarder | [`packages/daemon/src/trace-forwarder.ts`](./packages/daemon/src/trace-forwarder.ts) |
| Swap an LLM or embedder | [`packages/daemon/src/agents/`](./packages/daemon/src/agents/) (extract, dream), [`packages/server/src/llm/`](./packages/server/src/llm/) (digest). Embedder identity is canonical in [`packages/embed/src/index.ts`](./packages/embed/src/index.ts) — daemon + server share it |
| Tune a number / interval / cap | [`packages/server/src/infra/config.ts`](./packages/server/src/infra/config.ts) |
| Add an env var | [`packages/server/src/infra/env.ts`](./packages/server/src/infra/env.ts) |

## Where to act

| If you need to … | Use … |
|---|---|
| Read the live DB | the `mneme_sql` MCP tool (read-only, RLS-enforced) |
| Write to the DB the reader can't | `psql "$DATABASE_URL"` after sourcing `.env` |
| Apply a pending migration | `bun run migrate` (dry: `bun run migrate:dry`) |
| Typecheck or test | `bun run typecheck`, `bun test` |
| Find the active ticket | `gh issue list --repo j10ra/mneme` (Project 6: P0/P1/P2) |
| Read recent decisions | `git log --oneline -20` (commits explain WHY) |

Prefer `mneme_sql` over `psql` for any read — same scrubbing + reader role + RLS path the agent uses in production.

## Invariants — easy to break, hard to find out

| Rule | Pointer |
|---|---|
| Bump plugin version on every push (`/plugin update` keys off it) | [`packages/plugin/.claude-plugin/plugin.json`](./packages/plugin/.claude-plugin/plugin.json) + [`packages/plugin/package.json`](./packages/plugin/package.json) |
| `mneme_reader` role privileges are minimal by design; the `FORBIDDEN_RE` regex in `services/mcp.ts` is a tarpit, not the gate. Revisit the MCP boundary before granting any new privilege to that role | [`packages/server/src/services/mcp.ts`](./packages/server/src/services/mcp.ts) + [`docs/recall.md`](./docs/recall.md) |
| Don't hand-edit the plugin's scrubber artefact | source: [`packages/shared/src/scrub.ts`](./packages/shared/src/scrub.ts); regenerate via `bun run build:plugin-scrub` |
| Postgres `statement_timeout = 2 min` — long passes need pagination | [`docs/workers/nap.md`](./docs/workers/nap.md) |
| `meta.in_cluster` is sticky — only digest may re-point it | [`docs/workers/digest.md`](./docs/workers/digest.md) |
| `meta.last_napped_at` drives nap pagination — don't bypass | [`docs/workers/nap.md`](./docs/workers/nap.md) |
| Captures are immutable; never DELETE — use flags | [`docs/data-model.md`](./docs/data-model.md) |
| Server-stamped identity: `machine_id` from token, not body | [`packages/core/src/auth.ts`](./packages/core/src/auth.ts) |
| Admin password resolution: env → encrypted config → stdin | [`packages/plugin/src/core/admin-secret.ts`](./packages/plugin/src/core/admin-secret.ts) |
| New env var? add it to `env.ts` with zod validation | [`packages/server/src/infra/env.ts`](./packages/server/src/infra/env.ts) |
| Daemon trusts every loopback caller (accepted risk) — never run Mneme on a shared-user box | [`docs/capture-pipeline.md`](./docs/capture-pipeline.md) (Trust boundary) |
| OAuth-issued connector tokens must stay read-only: scope forced to `{read,mcp}` (never `capture`); never widen `scopeToArray` | [`packages/server/src/lib/oauth.ts`](./packages/server/src/lib/oauth.ts) + [`docs/oauth.md`](./docs/oauth.md) |

## Things to never do

- `--no-verify` on git commit
- Drive-by refactoring (touch only what the task requires)
- AI attribution in commits (no `Co-Authored-By`, no AI footer)
- DELETE rows that should be archived/superseded instead

## When stuck

1. `/mneme:status` — workers, daemons, dream history, breaker state, in one snapshot.
2. The `_ops.dashboard_*` views (capture rate, queue depth, dream health, surface freshness, extract throughput) — query via `psql "$DATABASE_URL"` (admin); no code reads them and the reader-role `mneme_sql` can't reach `_ops`. Use `mneme_sql` for `public.*` reads.
3. `gh issue view <N>` — most architectural decisions live in tickets.
4. `git log --oneline -20` — recent commits explain WHY.
