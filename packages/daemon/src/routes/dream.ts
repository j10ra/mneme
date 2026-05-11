// POST /dream/run
//
// Manual dream trigger. Same code path as the scheduler's "dream" job;
// this route is the operator's lever to fire one immediately rather
// than waiting on the next scheduled tick. Useful for validation,
// debugging, and ad-hoc cycles after a prompt or model tweak.

import type { Hono } from "hono";
import { Logger, mnemeRoute } from "@mneme/core";
import type { DreamCycleResult } from "../dream.ts";

export function mountDreamRoute(app: Hono, runDream: () => Promise<DreamCycleResult>): void {
  app.post("/dream/run", mnemeRoute("daemon.dream_run"), async (c) => {
    try {
      const result = await runDream();
      Logger.info("dream cycle (manual)", result);
      return c.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.error("dream cycle (manual) failed", err);
      return c.json({ error: msg }, 500);
    }
  });
}
