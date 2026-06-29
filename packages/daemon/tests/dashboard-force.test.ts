// Daemon /dashboard/api/worker/:name/run route. The dream + crystallize
// branches use injected callbacks (no LLM, no server). The nap/digest
// proxy branch reaches the real server + config and is verified
// manually, consistent with the other untested proxy routes here.

import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { mountDashboardRoutes } from "../src/routes/dashboard.ts";

const noopCrystallize = async () => ({ skipped: true as const });

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

    mountDashboardRoutes(app, async () => ({ skipped: true }), noopCrystallize);
    const resp = await app.request("/dashboard/api/worker/bogus/run", { method: "POST" });

    expect(resp.status).toBe(400);
  });
});
