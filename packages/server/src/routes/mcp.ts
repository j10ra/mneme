// Route for the MCP JSON-RPC dispatcher. The actual tool surface
// (mneme.sql) lives in mcp.ts; this file is just the HTTP wrapper.

import type { Hono } from "hono";
import { mnemeRoute, requireAuth } from "@mneme/core";
import { handleHttp as handleMcp } from "../services/mcp.ts";

export function mountMcpRoutes(app: Hono): void {
  app.post("/mcp", mnemeRoute("mcp"), requireAuth("mcp"), async (c) => {
    const body = await c.req.json().catch(() => null);

    if (body === null) return c.json({ error: "invalid_json" }, 400);
    const result = await handleMcp(body);

    if (result === null) return c.body(null, 204);

    return c.json(result as never);
  });
}
