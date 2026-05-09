# Mneme — orientation for agents

Greek muse of memory. Personal cross-machine memory layer for one user, three machines. Postgres + pgvector + tsvector behind a single SQL tool (`mneme_sql`) and a skill (`using-mneme`) that teaches the agent how to walk the data.

This file is a **router**, not a manual. Don't expect it to contain answers — expect it to point you at where the answer lives. Pull canonical material on demand.

## Where things live

| | path | when to read it |
|---|---|---|
| Project goals + comparison + architecture rationale | `ARCHITECTURE.md` (1.3k lines) | when designing a new feature or arguing about scope |
| User-facing setup + how-it-works | `README.md` | when explaining the system to humans |
| Schema + query patterns | `packages/plugin/skills/using-mneme/SKILL.md` | when querying via `mneme_sql` |
| Active work / decisions / specs | `gh issue list --repo j10ra/mneme` (Project 6 has Priority field: P0/P1/P2) | when picking up a ticket or filing one |
| Tuning knobs (numbers, intervals, caps) | `packages/server/src/infra/config.ts` | when something needs tuning |
| Env vars (single source of truth) | `packages/server/src/infra/env.ts` | when adding a config flag |

## The brain trio

Three time-driven workers in `packages/server/src/worker/`:
- **`nap`** (every 6h) — decay, shadow-mark, relate-pass, supersede-rule. Round-robin paginated via `meta.last_napped_at` so a single cycle stays under Postgres's 2-min statement_timeout.
- **`dream`** — clustering + per-cluster supersede. **Owned by the per-machine daemon** (`packages/daemon/`), not the server. Distributed-leader via Postgres advisory lock on `_ops.dream_runs`.
- **`digest`** (weekly, off by default — `MNEME_DIGEST_ENABLED=1` to opt in) — global cross-cluster operations: merge duplicate clusters, run cross-cluster supersede. Sonnet-grade via openrouter.

## Tools to reach for first

| task | tool |
|---|---|
| Read state from the live DB (joins, aggregates, schema lookups, dream history, etc.) | `mneme_sql` MCP tool — read-only, auto `LIMIT 200`, see `using-mneme` skill |
| Write state (DDL, UPDATE, DELETE) the reader can't do | `psql "$DATABASE_URL"` after sourcing `.env` |
| Apply a pending migration | `bun run migrate` (dry: `bun run migrate:dry`) — files in `migrations/` ordered by `NNNN_*.sql` |
| Typecheck | `bun run typecheck` |
| Tests | `bun test` |

`mneme_sql` is preferred over `psql` for any read because it goes through the same scrubbing + reader role + RLS path the agent will use in production. Drop to `psql` only when you need writes the reader can't perform.

## Invariants — things that are easy to break and hard to find out

- **Bump `packages/plugin/.claude-plugin/plugin.json` + `packages/plugin/package.json` version on every push.** `/plugin update` keys off this; an unbumped push won't reach machines.
- **`packages/plugin/scripts/scrub.ts` is a build artifact** generated from `packages/shared/src/scrub.ts` via `bun run build:plugin-scrub`. Edit the source, never the artifact.
- **Postgres `statement_timeout = 2min`** on Railway. Any worker query that fans out per-row needs an outer cap — see `nap.ts` step 3 for the round-robin pattern, `routes/dream.ts` for the cap-with-comment pattern.
- **Scrubbing is a contract.** Capture content goes through `scrubData` at the hook AND in spans. The shared scrubber catches shaped tokens (AWS, GitHub PAT, JWT, bearer); user-chosen passwords are caught by a per-machine literal redactor in the hook. Don't assume any incoming string is safe.
- **`meta.in_cluster` is sticky** per design — once set, the daemon dream never re-clusters. Only the `digest` worker can re-point it (and only via cluster merges, not free reclassification).
- **`meta.last_napped_at` drives nap pagination.** Stamping it on a row removes it from the next cycle's seed pick. Don't bypass.
- **Admin password resolution: env → encrypted config → stdin.** Encrypted with a key derived from the machine fingerprint (see `packages/plugin/scripts/admin-secret.ts`). The blob is useless without the machine — design defends backup/cloud-sync exfil, not malware running as the user.

## Architectural divisions

- **`packages/daemon/`** — per-machine: extract (Haiku via streaming Claude SDK), embed (local quantized bge-large), push, distributed dream. Owns the LLM cost on the user's hardware.
- **`packages/server/`** — central Postgres + Hono routes + scheduler-driven workers (nap, digest, keepalive). No tight extract/embed loops anymore; those moved to the daemon in #22.
- **`packages/plugin/`** — Claude Code plugin: hooks, slash commands, skills, install scripts. Fail-open: hook errors never block the harness.
- **`packages/core/`** — shared infra: tracing (`mnemeFn`, `mnemeRoute`, `withRootTrace`), auth, logger.
- **`packages/shared/`** — scrubber + cross-cutting types reachable from any package.

## Things to NOT do

- **No `--no-verify` on git commit.** Hooks exist for a reason; if one fires, fix the cause.
- **No "drive-by refactoring."** Touch only what the task requires (CLAUDE.md global rule).
- **No new env vars without adding them to `infra/env.ts`** with zod validation. The pattern catches missing/empty cases at boot.
- **No commits with `Co-Authored-By` AI attribution** (Cover Mode in CLAUDE.md global rules).
- **Don't re-`scrub.ts` the plugin artifact by hand.** Run `bun run build:plugin-scrub`.

## When stuck

1. **`/mneme:status`** — workers, daemons, dream history, breaker state in one snapshot.
2. **`mneme_sql` against `_ops.dashboard_*` views** (migration 0018) — capture rate, queue depth, dream health, surface freshness, extract throughput.
3. **`gh issue view <N>`** — most architectural decisions are documented in tickets, not in code comments.
4. **`git log --oneline -20`** — recent commits explain WHY more often than code does.
