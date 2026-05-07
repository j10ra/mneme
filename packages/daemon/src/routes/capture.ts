// POST /capture
//
// The hook's entry point: writes a raw capture into the outbox and
// returns its id. handleCapture validates required fields and scrubs
// strings at the edge before writing; everything else (extract, embed,
// push) happens later from the worker tick.

import type { Hono } from "hono";
import { mnemeRoute } from "@mneme/core";
import type { createRuntime } from "../runtime.ts";

type Runtime = ReturnType<typeof createRuntime>;

export function mountCaptureRoute(app: Hono, runtime: Runtime): void {
  app.post("/capture", mnemeRoute("daemon.capture"), async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) return c.json({ error: "invalid_json" }, 400);
    const result = await runtime.handleCapture(body as never);
    if (!result.ok) return c.json({ error: result.error }, 400);
    return c.json({ id: result.id });
  });
}
