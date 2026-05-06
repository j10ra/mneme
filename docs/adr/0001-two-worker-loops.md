# ADR 0001 — Two worker loops, not one

**Status:** Accepted (2026-05-07)

## Context

Mneme runs five background workers:

- `extract` and `embed` are **queue-driven**, polling `ingest_jobs` for work. Their cadence is short (5–10s) and they want to drain the queue back-to-back when work is available (`runOnce` returns `{ didWork: true }` → loop skips the sleep).
- `nap`, `dream`, and `keepalive` are **time-driven** with cadences of 6h–24h. Missing a cycle matters; long jobs (a 2-minute dream LLM call) must not re-fire on subsequent ticks; a process crash mid-cycle must not lose the schedule across redeploys.

These are implemented as two separate modules today:
- `packages/server/src/worker/index.ts::loop()` — tight poll, drain-aware, in-process state only.
- `packages/server/src/worker/scheduler.ts` — single 60s tick, persists `next_run_at` to `_ops.worker_runs`, claim-and-advance pattern, recovers stale claims at boot.

Architecture reviews regularly suggest unifying these into one `WorkerLoop` abstraction. This ADR records why we don't.

## Decision

Keep the two loops as separate modules. Do not introduce a unifying `WorkerLoop` abstraction over both.

## Consequences

**Why this is right:**
- **Drain semantics belong only in queue-driven loops.** `extract`/`embed` skip the sleep when `didWork && !pauseMs` so they can clear backlogs in seconds rather than waiting one interval per job. A unified shape would either lose this (bad for throughput on bursts) or push it into scheduled workers where it makes no sense (nap shouldn't drain).
- **DB-persisted scheduling belongs only in time-driven loops.** Tight-poll workers tolerate restarts because the next tick is seconds away and they re-read the queue. Scheduled workers need `_ops.worker_runs` so a Railway redeploy doesn't skip a 24h cycle, and so a long job doesn't re-fire on the next 60s tick. Forcing this onto extract/embed would mean a DB row per cycle for no reason.
- **Crash-recovery semantics differ.** The scheduler's stale-claim recovery (`scheduler.ts` boot-time `UPDATE`) only makes sense when a single claim represents an expensive, long-running cycle. The queue workers' `STALE_RUNNING` job-level recovery is in `ingest_jobs`, not the loop.

**What we accept:**
- The `Symbol.for(...)` singleton-via-globalThis pattern is duplicated between `worker/index.ts` and `scheduler.ts`. This is a small cost (~15 lines × 2) for keeping the modules independently understandable. If a third loop type ever appears, factor `processSingleton(symbolKey)` then.
- New workers must be classified into one of the two patterns at write time. There is no neutral middle ground.

**What this does not preclude:**
- Pulling shared *primitives* out of the loops (e.g., the `Breaker` class, a future `processJob` helper for the lock → external → write pattern). Those live one level inside `runOnce`, not at the loop layer.
- Replacing either loop module wholesale if its requirements change.

## Trigger to revisit

Reopen if a third worker pattern emerges that fits neither shape, or if `_ops.worker_runs` semantics need to apply to the queue workers (e.g., to coordinate scheduling across multiple server instances).
