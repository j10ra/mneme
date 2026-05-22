# Dashboard force-run for nap / dream / digest — design

- **Date:** 2026-05-22
- **Status:** approved, ready for implementation plan
- **Scope:** a dashboard control that runs each of the three brain-trio workers on demand. Bundles onto branch `feat/worker-pagination-reliability`.

---

## Problem

The three workers (`nap`, `dream`, `digest`) run only on their fixed schedules: nap every 6h, dream every 8h, digest every 48h. After a deploy, a prompt tweak, or to validate behaviour, the operator currently has no way to fire a cycle on demand. The only existing lever is the daemon's `POST /dream/run`, which is not surfaced in the dashboard and runs the normal current-window cycle (a no-op when that 8h window already completed).

## Goal

Three buttons on the dashboard Status panel, one per worker. Each runs that worker once, immediately, with the result visible through the panel's existing status polling. No new infrastructure: reuse the server scheduler and the daemon dream machinery already in place.

---

## Architecture context

- The **dashboard is served by the local daemon** (`127.0.0.1`, loopback-only, no dashboard-side auth). The React SPA calls `/dashboard/api/*` on the daemon; the daemon either reads local disk or proxies to the Railway server with the per-machine bearer token (`packages/daemon/src/routes/dashboard.ts`).
- **nap and digest run on the Railway server's scheduler** (`packages/server/src/worker/scheduler.ts`): a 60s `tick()` claims jobs whose `_ops.worker_runs.next_run_at <= now()` via `FOR UPDATE SKIP LOCKED`, runs them, and records `last_status` / `last_error`.
- **dream runs on the daemon** (`packages/daemon/src/dream.ts` `runDreamCycle`), coordinated by a per-8h-window advisory lock row in `_ops.dream_runs`. It must stay daemon-side: dream calls the LLM through the user's `claude` login, and server-side dream would need separately-paid API keys (decision recorded in `docs/workers/dream.md`).

The feature therefore splits in two: server-side workers are nudged through the scheduler; dream is run directly on the daemon.

No migrations. The feature uses the existing `_ops.worker_runs` and `_ops.dream_runs` tables unchanged.

---

## Section 1 — Server: force endpoint

New route in `packages/server/src/routes/ops.ts`:

`POST /api/_ops/worker/:name/run`, `requireAuth("capture")`.

- `name` must be one of an allowlist: `nap`, `digest`. Any other value returns `400 { error: "unknown worker" }`.
- Look up the `_ops.worker_runs` row for `name`. If absent (for example digest when `MNEME_DIGEST_ENABLED` is off, so it was never registered), return `404 { error: "worker not registered" }`.
- Otherwise `UPDATE _ops.worker_runs SET next_run_at = now(), last_status = NULL, last_error = NULL WHERE job_name = ${name}`. Clearing `last_status` matters: the partial index `worker_runs_next_run_idx` excludes `last_status = 'failed'` rows, so without the clear a previously-failed worker would never be re-claimed. This makes force-run double as a retry for a failed worker.
- Return `200 { queued: true, job: name, next_run_at }`.

The scheduler's next tick (within 60s) claims the row through its existing `FOR UPDATE SKIP LOCKED` path and runs the worker. Going through the scheduler rather than calling `runNapOnce` / `runDigestOnce` inline means the force can never double-run against a concurrent scheduled cycle, and `last_status` / `last_error` are recorded normally.

The allowlist check is a small pure helper (`isForceableWorker(name): boolean`) so it is unit-testable without a DB.

`capture` scope is correct here: it matches the existing `/api/dream/*` coordination endpoints, and the daemon (which proxies this call) holds only the per-machine token, never admin credentials.

---

## Section 2 — Daemon: dashboard-api route

New route in `packages/daemon/src/routes/dashboard.ts`:

`POST /dashboard/api/worker/:name/run`, loopback-only (no auth, consistent with every existing `/dashboard/api/*` route).

- `name` must be one of `nap`, `digest`, `dream`; otherwise `400`.
- **`nap` / `digest`** — proxy a `POST` to `${serverUrl}/api/_ops/worker/${name}/run` with `Authorization: Bearer ${token}` (same `readDaemonConfig` pattern the existing proxy helpers use). Return the server's status and body verbatim.
- **`dream`** — start a forced dream cycle in the background and return `202 { queued: true, job: "dream" }` immediately. Dream distills through the LLM and can take minutes; a synchronous response would hang the request and the button.

### Force-dream mechanism: synthetic window key

`runDreamCycle` accepts an optional `windowKey` (already used by tests to override the window). A forced run is invoked as `runDreamCycle({ ...deps, windowKey: -Date.now() })`:

- `window_key` is the primary key of `_ops.dream_runs` and is used only for lock coordination; the candidate query does not filter by it. A unique negative key (current epoch millis, negated) can never collide with a real 8h window (`floor(epoch / 28800)`, a small positive integer), so `acquireDreamLock` always succeeds and the cycle always runs a real distillation.
- This delivers the approved "force always runs a real dream cycle" behaviour **without** clearing or touching the current 8h window's lock. The forced run and the scheduled run stay independent: forcing dream does not consume the scheduled window's slot, and the scheduled cycle still fires normally.
- Each force leaves one extra row in `_ops.dream_runs` under a negative `window_key`. These are tiny and harmless; `clearStaleDreamLocks` already reaps any that crash mid-cycle (incomplete + old). No cleanup work is required.

A `forceDream` callback (`() => runDreamCycle({ ...deps, windowKey: -Date.now() })`) is wired into `mountDashboardRoutes` alongside the existing `runDream` wiring. The existing top-level `POST /dream/run` route is left unchanged (out of scope).

---

## Section 3 — Dashboard SPA

In `packages/plugin/dashboard/`, add three force buttons to the existing Status panel, one per worker (`nap`, `dream`, `digest`), placed with each worker's existing status row.

- Click posts to `/dashboard/api/worker/${name}/run` via the existing `lib/api.ts` POST helper.
- While the request is in flight the button shows a disabled / busy state; on completion it re-enables.
- The outcome surfaces through the Status panel's existing polling: `worker_runs.last_run_at` / `last_status` for nap and digest (already shown in the panel), and the daemon-schedule plus dream-run rows for dream. No new status-display wiring is needed beyond what the panel already renders.
- A `404 worker not registered` response (digest disabled) is shown as a brief inline message rather than a hard error.

Follow the dashboard's existing component conventions (Base UI primitives, per the established shadcn-on-Base-UI pass). Keep the button visual minimal and consistent with the panel.

---

## Section 4 — Auth and safety

- Server endpoint: `requireAuth("capture")`. Consistent with `/api/dream/lock|candidates|clusters`.
- Daemon endpoint: loopback-only, no auth, matching every existing `/dashboard/api/*` route. The daemon binds `127.0.0.1`; reaching the route already means being inside the machine boundary.
- All three forces are safe to repeat:
  - nap / digest go through `FOR UPDATE SKIP LOCKED`, so a force can never double-run against a scheduled cycle.
  - A forced dream re-run is harmless and even useful: the `last_dreamed_at` watermark (from the worker-pagination work on this branch) means each run drains the next slice of the backlog rather than repeating one.

---

## Testing

- **Server** — a pure unit test for `isForceableWorker` (accepts `nap` / `digest`, rejects anything else). A DB-backed smoke test that posts to `/api/_ops/worker/digest/run` and asserts the `worker_runs` row's `next_run_at` advanced to approximately now and `last_status` / `last_error` were cleared, then asserts `400` for an unknown name. The smoke test does cause one early scheduled run of that worker, which is harmless (that is the feature working) and concurrency-safe via SKIP-LOCKED.
- **Daemon** — a route test with mocked `fetch` and mocked config: `POST /dashboard/api/worker/nap/run` proxies to the server path with the bearer token; `POST /dashboard/api/worker/dream/run` invokes the injected `forceDream` callback and returns `202`; an unknown name returns `400`. Mirrors the existing mocked-fetch pattern in `packages/daemon/tests/dream.test.ts`.
- **Dashboard** — manual verification: each button fires, the Status panel reflects the run.
- `bun run typecheck` and `bun test` green before each section is considered done.

---

## Implementation order

1. **Server force endpoint** — `isForceableWorker` + `POST /api/_ops/worker/:name/run` in `ops.ts`.
2. **Daemon dashboard-api route** — `POST /dashboard/api/worker/:name/run`; proxy for nap/digest, synthetic-window `forceDream` for dream; wire `forceDream` into `mountDashboardRoutes`.
3. **Dashboard SPA** — three force buttons on the Status panel; rebuild the dashboard dist (`bun run build` in `packages/plugin/dashboard/`, no CI builds it).
4. **Plugin version bump** — `packages/plugin/.claude-plugin/plugin.json` + `packages/plugin/package.json` (dashboard SPA + daemon change ship through the plugin).

---

## Risks / trade-offs

- **Up to 60s latency for nap / digest.** The scheduler tick is 60s. For a maintenance button this is acceptable, and it buys concurrency-safety and normal status bookkeeping. Not optimised further.
- **Accumulating negative-key rows in `_ops.dream_runs`.** One tiny row per forced dream. Harmless; reaping is not worth building. Noted for awareness.
- **digest force when `MNEME_DIGEST_ENABLED` is off** returns `404`; the dashboard surfaces it as an inline message. Acceptable: a disabled worker genuinely cannot be forced.

## Out of scope

- Changing the existing top-level `POST /dream/run` route.
- Changing worker schedules or the 60s scheduler tick interval.
- Forcing `keepalive` or `prune`.
- Any new status-display panel beyond the existing Status panel rows.
- A progress indicator for the in-flight dream cycle beyond the button busy state.
