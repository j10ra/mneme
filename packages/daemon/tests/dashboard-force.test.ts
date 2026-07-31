// Daemon /dashboard/api/worker/:name/run route. The dream + crystallize
// branches use injected callbacks (no LLM, no server). The nap/digest
// proxy branch reaches the real server + config and is verified
// manually, consistent with the other untested proxy routes here.

import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { mountDashboardRoutes } from "../src/routes/dashboard.ts";

const noopCrystallize = async () => ({ skipped: true as const });
const noopOutbox = {
  deleteFailed: async () => 0,
  list: async () => [],
  rehydrateFailed: async () => 0,
};

describe("POST /dashboard/api/worker/:name/run", () => {
  test("dream: invokes forceDream and returns 202", async () => {
    let called = 0;
    const app = new Hono();

    mountDashboardRoutes(
      app,
      async () => {
        called++;

        return { skipped: false, clustersSubmitted: 0, clustersWritten: 0 };
      },
      noopCrystallize,
      noopOutbox,
      "machine-test",
    );
    const resp = await app.request("/dashboard/api/worker/dream/run", { method: "POST" });

    expect(resp.status).toBe(202);
    const body = (await resp.json()) as { queued: boolean; job: string };

    expect(body.queued).toBe(true);
    expect(body.job).toBe("dream");
    expect(called).toBe(1);
  });

  test("crystallize: invokes forceCrystallize and returns 202", async () => {
    let called = 0;
    const app = new Hono();

    mountDashboardRoutes(
      app,
      async () => ({ skipped: true }),
      async () => {
        called++;

        return { skipped: false, conceptsSubmitted: 0, conceptsWritten: 0 };
      },
      noopOutbox,
      "machine-test",
    );
    const resp = await app.request("/dashboard/api/worker/crystallize/run", { method: "POST" });

    expect(resp.status).toBe(202);
    const body = (await resp.json()) as { queued: boolean; job: string };

    expect(body.queued).toBe(true);
    expect(body.job).toBe("crystallize");
    expect(called).toBe(1);
  });

  test("unknown worker returns 400", async () => {
    const app = new Hono();

    mountDashboardRoutes(
      app,
      async () => ({ skipped: true }),
      noopCrystallize,
      noopOutbox,
      "machine-test",
    );
    const resp = await app.request("/dashboard/api/worker/bogus/run", { method: "POST" });

    expect(resp.status).toBe(400);
  });
});

describe("POST /dashboard/api/outbox/failed/:action", () => {
  test("retry restores failed captures and reports the remaining count", async () => {
    let failed = 3;
    const app = new Hono();
    const outbox = {
      deleteFailed: async () => 0,
      list: async () => Array.from({ length: failed }, (_, i) => String(i)),
      rehydrateFailed: async () => {
        const affected = failed;

        failed = 0;

        return affected;
      },
    };

    mountDashboardRoutes(
      app,
      async () => ({ skipped: true }),
      noopCrystallize,
      outbox,
      "machine-test",
    );
    const resp = await app.request("/dashboard/api/outbox/failed/retry", { method: "POST" });

    expect(resp.status).toBe(200);
    expect(await resp.json()).toEqual({
      ok: true,
      action: "retry",
      affected: 3,
      remaining: 0,
    });
  });

  test("delete removes failed captures", async () => {
    let failed = 2;
    const app = new Hono();
    const outbox = {
      deleteFailed: async () => {
        const affected = failed;

        failed = 0;

        return affected;
      },
      list: async () => Array.from({ length: failed }, (_, i) => String(i)),
      rehydrateFailed: async () => 0,
    };

    mountDashboardRoutes(
      app,
      async () => ({ skipped: true }),
      noopCrystallize,
      outbox,
      "machine-test",
    );
    const resp = await app.request("/dashboard/api/outbox/failed/delete", { method: "POST" });

    expect(resp.status).toBe(200);
    expect(await resp.json()).toEqual({
      ok: true,
      action: "delete",
      affected: 2,
      remaining: 0,
    });
  });

  test("rejects an unknown failed-capture action", async () => {
    const app = new Hono();

    mountDashboardRoutes(
      app,
      async () => ({ skipped: true }),
      noopCrystallize,
      noopOutbox,
      "machine-test",
    );
    const resp = await app.request("/dashboard/api/outbox/failed/archive", { method: "POST" });

    expect(resp.status).toBe(400);
  });
});
