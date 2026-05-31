// Route for the MCP JSON-RPC dispatcher. The actual tool surface
// (mneme.sql) lives in mcp.ts; this file is just the HTTP wrapper.

import type { Hono, MiddlewareHandler } from "hono";
import { mnemeRoute, requireAuth } from "@mneme/core";
import { publicOrigin } from "../lib/origin.ts";
import { handleHttp as handleMcp } from "../services/mcp.ts";

// On a 401 from requireAuth, advertise the OAuth flow so MCP clients can
// discover it (#59): WWW-Authenticate points at the protected-resource
// metadata. Kept server-side (not in core) so the bundled plugin daemon
// is untouched. Runs before requireAuth and stamps the header after the
// inner chain has set the 401 response.
const oauthChallenge: MiddlewareHandler = async (c, next) => {
  await next();

  if (c.res.status === 401) {
    const base = publicOrigin(c);

    c.res.headers.set(
      "WWW-Authenticate",
      `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`,
    );
  }
};

export function mountMcpRoutes(app: Hono): void {
  app.post("/mcp", mnemeRoute("mcp"), oauthChallenge, requireAuth("mcp"), async (c) => {
    const body = await c.req.json().catch(() => null);

    if (body === null) return c.json({ error: "invalid_json" }, 400);
    const result = await handleMcp(body);

    if (result === null) return c.body(null, 204);

    return c.json(result as never);
  });
}
