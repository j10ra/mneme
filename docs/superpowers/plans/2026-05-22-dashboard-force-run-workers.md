# Dashboard Force-Run Workers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dashboard control that runs each of `nap`, `dream`, and `digest` on demand.

**Architecture:** nap and digest are nudged through the existing server scheduler (a new `capture`-scoped endpoint sets `_ops.worker_runs.next_run_at = now()`; the 60s tick claims and runs them via `FOR UPDATE SKIP LOCKED`). dream is run directly on the daemon via `runDreamCycle` with a unique synthetic negative `window_key`, so a forced cycle always runs without touching the scheduled 8h window. The dashboard SPA gets one force button per worker.

**Tech Stack:** Bun, TypeScript, Hono, Postgres, React (dashboard SPA, Base UI primitives).

**Spec:** `docs/superpowers/specs/2026-05-22-dashboard-force-run-workers-design.md`

**Branch:** bundles onto `feat/worker-pagination-reliability` (already checked out).

---

## File map

| File | Change |
|---|---|
| `packages/server/src/routes/ops.ts` | Modify. Add `isForceableWorker`, `forceWorkerRun`, and `POST /api/_ops/worker/:name/run`. |
| `packages/server/tests/ops-worker-force.test.ts` | Create. Unit + smoke tests. |
| `packages/daemon/src/routes/dashboard.ts` | Modify. `mountDashboardRoutes` gains a `forceDream` param; add `POST /dashboard/api/worker/:name/run`. |
| `packages/daemon/src/index.ts` | Modify. Extract `dreamDeps`, add `forceDream`, pass it to `mountDashboardRoutes`. |
| `packages/daemon/tests/dashboard-force.test.ts` | Create. Daemon route test. |
| `packages/plugin/dashboard/src/lib/api.ts` | Modify. Add `apiPost`. |
| `packages/plugin/dashboard/src/components/StatusPanel.tsx` | Modify. Add `ForceButton`, wire into worker rows + Dream section. |
| `packages/plugin/dashboard/dist/` | Rebuilt artifact (committed; no CI builds it). |
| `packages/plugin/.claude-plugin/plugin.json`, `packages/plugin/package.json` | Modify. Version bump. |

---

## Task A1: `isForceableWorker` allowlist helper

**Files:**
- Modify: `packages/server/src/routes/ops.ts`
- Test: `packages/server/tests/ops-worker-force.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/server/tests/ops-worker-force.test.ts`:

```ts
// Force-run endpoint tests. isForceableWorker is pure; forceWorkerRun
// touches _ops.worker_runs and is DB-gated.

import { describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe("isForceableWorker", () => {
  test("accepts nap and digest only", async () => {
    const { isForceableWorker } = await import("../src/routes/ops.ts");
    expect(isForceableWorker("nap")).toBe(true);
    expect(isForceableWorker("digest")).toBe(true);
    for (const n of ["dream", "keepalive", "prune", "", "NAP", "../x"]) {
      expect(isForceableWorker(n)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/server/tests/ops-worker-force.test.ts -t "isForceableWorker"`
Expected: FAIL with `isForceableWorker is not a function`.

- [ ] **Step 3: Implement `isForceableWorker`**

In `packages/server/src/routes/ops.ts`, add after the imports / top-level constants (before `mountOpsRoutes`):

```ts
// Workers the dashboard may force-run. dream is excluded -- it runs on
// the daemon, not the server scheduler. keepalive / prune are not
// operator-facing.
const FORCEABLE_WORKERS = ["nap", "digest"] as const;

/** True when `name` is a server-scheduled worker the force endpoint
 *  will accept. Pure -- the route uses it to reject unknown names. */
export function isForceableWorker(name: string): boolean {
  return (FORCEABLE_WORKERS as readonly string[]).includes(name);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/server/tests/ops-worker-force.test.ts -t "isForceableWorker"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routes/ops.ts packages/server/tests/ops-worker-force.test.ts
git commit -m "(feat): add isForceableWorker allowlist for force-run endpoint"
```

---

## Task A2: `forceWorkerRun` + `POST /api/_ops/worker/:name/run`

**Files:**
- Modify: `packages/server/src/routes/ops.ts`
- Test: `packages/server/tests/ops-worker-force.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `packages/server/tests/ops-worker-force.test.ts`:

```ts
describe("forceWorkerRun: bad name", () => {
  test("returns a 400 result for an unknown worker", async () => {
    const { forceWorkerRun } = await import("../src/routes/ops.ts");
    const r = await forceWorkerRun("bogus");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
});

describe.skipIf(!HAS_DB)("forceWorkerRun: DB (requires DATABASE_URL)", () => {
  test("digest: advances next_run_at to now and clears last_status", async () => {
    const { forceWorkerRun } = await import("../src/routes/ops.ts");
    const { sql } = await import("../src/infra/db.ts");

    const [before] = await sql<
      { next_run_at: Date; last_status: string | null; last_error: string | null }[]
    >`
      SELECT next_run_at, last_status, last_error
      FROM _ops.worker_runs WHERE job_name = 'digest'
    `;
    if (!before) return; // digest not registered in this deployment; nothing to assert

    try {
      const r = await forceWorkerRun("digest");
      expect(r.ok).toBe(true);
      const [after] = await sql<{ next_run_at: Date; last_status: string | null }[]>`
        SELECT next_run_at, last_status FROM _ops.worker_runs WHERE job_name = 'digest'
      `;
      expect(after!.last_status).toBeNull();
      expect(Date.now() - new Date(after!.next_run_at).getTime()).toBeLessThan(10_000);
    } finally {
      // Restore so the real digest schedule is not perturbed by the test.
      await sql`
        UPDATE _ops.worker_runs
        SET next_run_at = ${before.next_run_at},
            last_status = ${before.last_status},
            last_error = ${before.last_error}
        WHERE job_name = 'digest'
      `;
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test packages/server/tests/ops-worker-force.test.ts -t "forceWorkerRun"`
Expected: FAIL with `forceWorkerRun is not a function`.

- [ ] **Step 3: Implement `forceWorkerRun` and the route**

In `packages/server/src/routes/ops.ts`, add `forceWorkerRun` right after `isForceableWorker`:

```ts
export type ForceRunResult =
  | { ok: true; job: string; next_run_at: Date }
  | { ok: false; status: 400 | 404; error: string };

/** Nudge a server-scheduled worker to run on the next scheduler tick.
 *  Sets next_run_at = now() and clears last_status / last_error so the
 *  scheduler's partial index re-claims a previously-failed job. The
 *  scheduler's FOR UPDATE SKIP LOCKED claim guarantees the forced run
 *  never overlaps a concurrent scheduled cycle. */
export async function forceWorkerRun(name: string): Promise<ForceRunResult> {
  if (!isForceableWorker(name)) {
    return { ok: false, status: 400, error: "unknown worker" };
  }
  const rows = await sql<{ next_run_at: Date }[]>`
    UPDATE _ops.worker_runs
    SET next_run_at = now(), last_status = NULL, last_error = NULL
    WHERE job_name = ${name}
    RETURNING next_run_at
  `;
  if (rows.length === 0) {
    return { ok: false, status: 404, error: "worker not registered" };
  }
  return { ok: true, job: name, next_run_at: rows[0]!.next_run_at };
}
```

Then, inside `mountOpsRoutes`, add this route alongside the other `app.get("/api/_ops/...")` registrations:

```ts
  app.post(
    "/api/_ops/worker/:name/run",
    mnemeRoute("api._ops.worker.run"),
    requireAuth("capture"),
    async (c) => {
      const r = await forceWorkerRun(c.req.param("name"));
      if (!r.ok) return c.json({ error: r.error }, r.status);
      return c.json({ queued: true, job: r.job, next_run_at: r.next_run_at });
    },
  );
```

- [ ] **Step 4: Run the tests + typecheck**

Run: `bun test packages/server/tests/ops-worker-force.test.ts`
Expected: PASS (isForceableWorker, bad-name, and the DB smoke test).
Run: `bun run typecheck`
Expected: clean, exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routes/ops.ts packages/server/tests/ops-worker-force.test.ts
git commit -m "(feat): add server force-run endpoint for nap + digest"
```

---

## Task B1: Daemon force-run route

**Files:**
- Modify: `packages/daemon/src/routes/dashboard.ts`
- Modify: `packages/daemon/src/index.ts`
- Test: `packages/daemon/tests/dashboard-force.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/daemon/tests/dashboard-force.test.ts`:

```ts
// Daemon /dashboard/api/worker/:name/run route. The dream branch uses
// the injected forceDream callback (no LLM, no server). The nap/digest
// proxy branch reaches the real server + config and is verified
// manually, consistent with the other untested proxy routes here.

import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { mountDashboardRoutes } from "../src/routes/dashboard.ts";

describe("POST /dashboard/api/worker/:name/run", () => {
  test("dream: invokes forceDream and returns 202", async () => {
    let called = 0;
    const app = new Hono();
    mountDashboardRoutes(app, async () => {
      called++;
      return { skipped: false, clustersSubmitted: 0, clustersWritten: 0 };
    });
    const resp = await app.request("/dashboard/api/worker/dream/run", { method: "POST" });
    expect(resp.status).toBe(202);
    const body = (await resp.json()) as { queued: boolean; job: string };
    expect(body.queued).toBe(true);
    expect(body.job).toBe("dream");
    expect(called).toBe(1);
  });

  test("unknown worker returns 400", async () => {
    const app = new Hono();
    mountDashboardRoutes(app, async () => ({ skipped: true }));
    const resp = await app.request("/dashboard/api/worker/bogus/run", { method: "POST" });
    expect(resp.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/daemon/tests/dashboard-force.test.ts`
Expected: FAIL — `mountDashboardRoutes` currently takes one argument; passing a second is a type error, and the route does not exist (404 instead of 202).

- [ ] **Step 3: Add `forceDream` param + the route to `dashboard.ts`**

In `packages/daemon/src/routes/dashboard.ts`:

Add the type import near the top, after the existing `@mneme/core` import:

```ts
import type { DreamCycleResult } from "../dream.ts";
```

Change the `mountDashboardRoutes` signature:

```ts
export function mountDashboardRoutes(
  app: Hono,
  forceDream: () => Promise<DreamCycleResult>,
): void {
```

Then, inside `mountDashboardRoutes`, add this route (a natural spot is right after the `/dashboard/api/status` registration):

```ts
  // POST /dashboard/api/worker/:name/run — force one worker cycle.
  // nap | digest: proxy a POST to the server's force endpoint. dream:
  // run a forced cycle locally in the background and return 202 --
  // dream distills via the LLM and can take minutes, so a synchronous
  // response would hang the request.
  app.post(
    "/dashboard/api/worker/:name/run",
    mnemeRoute("daemon.dashboard.worker_run"),
    async (c) => {
      const name = c.req.param("name");
      if (name === "dream") {
        void forceDream().catch((err) => {
          Logger.error("dashboard: forced dream cycle failed", err);
        });
        return c.json({ queued: true, job: "dream" }, 202);
      }
      if (name === "nap" || name === "digest") {
        const cfg = await readDaemonConfig();
        if (!cfg) return c.json({ error: "config not loaded" }, 503);
        try {
          const resp = await fetch(`${cfg.serverUrl}/api/_ops/worker/${name}/run`, {
            method: "POST",
            headers: { Authorization: `Bearer ${cfg.token}` },
          });
          const body = await resp.text();
          return c.body(body, resp.status as 200, {
            "content-type": resp.headers.get("content-type") ?? "application/json",
          });
        } catch (err) {
          Logger.warn("dashboard.worker_run: upstream fetch failed", err);
          return c.json({ error: "upstream unavailable" }, 502);
        }
      }
      return c.json({ error: "unknown worker" }, 400);
    },
  );
```

- [ ] **Step 4: Wire `forceDream` in `index.ts`**

In `packages/daemon/src/index.ts`:

Add `type DreamDeps` to the existing `./dream.ts` import (it currently imports `resumeDreamCycles, runDreamCycle`):

```ts
import { type DreamDeps, resumeDreamCycles, runDreamCycle } from "./dream.ts";
```

Replace the existing `const runDream = () => runDreamCycle({ ... })` block (the closure that builds the deps inline) with an extracted deps object plus both closures:

```ts
  const dreamDeps: DreamDeps = {
    serverUrl: config.server_url,
    token: config.token,
    machineId: config.machine_id,
    fetch: (u, init) => fetch(u, init),
    distill: (memories) => {
      if (!agent.distill) {
        throw new Error(`agent ${agent.name} does not support dream (no distill())`);
      }
      return agent.distill(memories);
    },
    embed: embedBatch,
    findSupersedes: agent.findSupersedes
      ? (candidates) => agent.findSupersedes!(candidates)
      : undefined,
    outbox: dreamOutbox,
  };
  const runDream = () => runDreamCycle(dreamDeps);
  // Forced cycle: a unique negative window_key (epoch millis, negated)
  // can never collide with a real 8h window (a small positive integer),
  // so acquireDreamLock always succeeds and the cycle always runs.
  // window_key is BIGINT, so the large negative value is in range.
  const forceDream = () => runDreamCycle({ ...dreamDeps, windowKey: -Date.now() });
```

Then change the `mountDashboardRoutes(app)` call to:

```ts
  mountDashboardRoutes(app, forceDream);
```

- [ ] **Step 5: Run the test + typecheck, then commit**

Run: `bun test packages/daemon/tests/dashboard-force.test.ts`
Expected: PASS (2 tests).
Run: `bun run typecheck`
Expected: clean, exit 0.

```bash
git add packages/daemon/src/routes/dashboard.ts packages/daemon/src/index.ts packages/daemon/tests/dashboard-force.test.ts
git commit -m "(feat): add daemon force-run route for nap, digest, dream"
```

---

## Task C1: `apiPost` helper

**Files:**
- Modify: `packages/plugin/dashboard/src/lib/api.ts`

- [ ] **Step 1: Add `apiPost`**

`api.ts` currently has `apiGet` and `openStream` but no POST helper. Add `apiPost`, mirroring `apiGet`, after `apiGet`:

```ts
/** POST to a /dashboard/api/* endpoint. Sends `body` as JSON when
 *  provided. Throws ApiError on a non-2xx response, same as apiGet. */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new ApiError(`${path} failed: ${resp.status} ${text.slice(0, 200)}`, resp.status);
  }
  return (await resp.json()) as T;
}
```

- [ ] **Step 2: Typecheck the dashboard build**

Run: `cd packages/plugin/dashboard && bun run build`
Expected: build succeeds (this type-checks and bundles the SPA). `cd` back to repo root afterwards.

- [ ] **Step 3: Commit**

```bash
git add packages/plugin/dashboard/src/lib/api.ts
git commit -m "(feat): add apiPost helper to dashboard api client"
```

(The rebuilt `dist/` is committed in Task C2 once the SPA actually uses `apiPost`.)

---

## Task C2: Force buttons in the Status panel

**Files:**
- Modify: `packages/plugin/dashboard/src/components/StatusPanel.tsx`
- Rebuild: `packages/plugin/dashboard/dist/`

- [ ] **Step 1: Add the `ForceButton` component**

In `packages/plugin/dashboard/src/components/StatusPanel.tsx`:

Add `apiPost` to the existing `../lib/api.ts` import (currently `import { ApiError, apiGet } from "../lib/api.ts";`):

```ts
import { ApiError, apiGet, apiPost } from "../lib/api.ts";
```

Add the `Button` import (the file does not import it yet):

```ts
import { Button } from "./ui/button.tsx";
```

Add the `ForceButton` component near the other small components at the bottom of the file (next to `SectionHeading` / `Empty`):

```tsx
// Force-run button. Posts to /dashboard/api/worker/<worker>/run and
// shows the outcome; the panel's 30s poll reflects the actual run.
function ForceButton({ worker }: { worker: string }) {
  const [phase, setPhase] = useState<"idle" | "busy" | "done" | "error">("idle");
  const onClick = async () => {
    setPhase("busy");
    try {
      await apiPost(`/worker/${worker}/run`);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  };
  const label =
    phase === "busy"
      ? "running"
      : phase === "done"
        ? "queued"
        : phase === "error"
          ? "failed"
          : "run now";
  return (
    <Button
      size="xs"
      variant={phase === "error" ? "secondary" : "ghost"}
      disabled={phase === "busy"}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
```

- [ ] **Step 2: Wire the button into the worker rows**

In `WorkerRowItem`, render a `ForceButton` for the forceable workers only (`nap`, `digest`). Replace the `WorkerRowItem` function body's right-hand `<div>` group so the button sits after the timing text:

```tsx
function WorkerRowItem({ w }: { w: WorkerRow }) {
  const status = w.last_status ?? "ok";
  const forceable = w.name === "nap" || w.name === "digest";
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-border bg-card px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "inline-block h-2 w-2 shrink-0 rounded-full",
            status === "ok" ? "bg-success" : "bg-destructive",
          )}
        />
        <span className="font-medium truncate">{w.name}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          last {fmtAge(w.since_last_run_ms)} ago
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
        {w.last_duration_ms !== null && <span>{fmtDuration(w.last_duration_ms)}</span>}
        <span className="whitespace-nowrap">
          next in {fmtAge(Math.max(0, new Date(w.next_run_at).getTime() - Date.now()))}
        </span>
        {forceable && <ForceButton worker={w.name} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire the button into the Dream section**

In `StatusContent`, the Dream section is a bordered `<div>` containing a flex-wrap row of `<span>`s. Add a `ForceButton` for dream as the last child of that inner `flex flex-wrap` row, immediately after the `{data.dream.stuck > 0 && (...)}` block and before the row's closing `</div>`:

```tsx
          {data.dream.stuck > 0 && (
            <Badge variant="warning">
              <CircleAlert className="h-3 w-3" />
              {data.dream.stuck} stuck &gt; 30m
            </Badge>
          )}
          <ForceButton worker="dream" />
```

- [ ] **Step 4: Build the dashboard**

Run: `cd packages/plugin/dashboard && bun run build`
Expected: build succeeds with no type errors; `dist/` is regenerated. `cd` back to the repo root.

- [ ] **Step 5: Commit**

```bash
git add packages/plugin/dashboard/src/components/StatusPanel.tsx packages/plugin/dashboard/dist
git commit -m "(feat): add force-run buttons to dashboard Status panel"
```

---

## Task D1: Plugin version bump

**Files:**
- Modify: `packages/plugin/.claude-plugin/plugin.json`
- Modify: `packages/plugin/package.json`

- [ ] **Step 1: Read the current version**

Run: `grep '"version"' packages/plugin/.claude-plugin/plugin.json packages/plugin/package.json`
Note the current version (it is `1.1.32` unless a later commit bumped it again).

- [ ] **Step 2: Bump the patch version in both files**

Set the `"version"` field in BOTH `packages/plugin/.claude-plugin/plugin.json` and `packages/plugin/package.json` to the next patch (e.g. `1.1.32` becomes `1.1.33`). The two files must match.

- [ ] **Step 3: Verify they match**

Run: `grep '"version"' packages/plugin/.claude-plugin/plugin.json packages/plugin/package.json`
Expected: both files show the same new version.

- [ ] **Step 4: Commit**

```bash
git add packages/plugin/.claude-plugin/plugin.json packages/plugin/package.json
git commit -m "(chore): bump plugin version"
```

---

## Final verification

- [ ] `bun run typecheck` — clean.
- [ ] `bun test` — all pass (4 new tests added: `isForceableWorker`, `forceWorkerRun` bad-name, `forceWorkerRun` DB smoke, daemon route x2; minus environment skips).
- [ ] `cd packages/plugin/dashboard && bun run build` — succeeds, `dist/` current.
- [ ] Manual: open the dashboard, click each force button. nap/digest show `queued`; the worker row's `next in` resets and `last ... ago` updates within ~60s. dream shows `queued`; a dream cycle appears in the daemon logs.

---

## Self-review notes

- **Spec coverage:** Section 1 (server endpoint) → A1 + A2. Section 2 (daemon route, synthetic-window force-dream) → B1. Section 3 (dashboard SPA) → C1 + C2. Section 4 (auth) → `requireAuth("capture")` in A2, loopback-only in B1. Plugin bump → D1. No migrations (spec confirms).
- **Synthetic window key:** `-Date.now()` is a JS-safe integer and fits Postgres `BIGINT` (`_ops.dream_runs.window_key`); confirmed against `migrations/0014_daemon_tables.sql`.
- **Type consistency:** `forceWorkerRun` returns `ForceRunResult` (A2), consumed by the A2 route. `mountDashboardRoutes(app, forceDream)` signature (B1) matches the `index.ts` call site (B1) and the test (B1). `apiPost` (C1) is consumed by `ForceButton` (C2).
- **Testing limits:** the nap/digest proxy branch of the daemon route is not automatically tested (it needs a real config + server); it follows the established `proxyHandler` pattern in the same file and is covered by the manual check. The server smoke test restores the `digest` row so it does not perturb the real schedule.
