// Operator-facing routes: liveness check + manual flush.
//
// /health is what the plugin install flow polls after launchctl-loading
// the service. /flush is what the hook pings on natural session
// boundaries (Stop, PreCompact, SessionEnd) so extract doesn't wait
// for the idle window.

import type { Hono } from "hono";
import { Logger } from "@mneme/core";
import type { createRuntime } from "../runtime.ts";

type Runtime = ReturnType<typeof createRuntime>;

export function mountOpsRoutes(app: Hono, runtime: Runtime): void {
  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/flush", (c) => {
    // Fire-and-forget: the hook's flush ping is a hint, not a synchronous
    // request. Don't block on extract latency.
    void runtime.flush().catch((err) => {
      Logger.error("flush failed", err);
    });
    return c.json({ ok: true, accepted: true }, 202);
  });
}
