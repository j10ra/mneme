// POST /embed
//
// MCP query support: the plugin's mcp-proxy intercepts embed('...')
// macros in incoming SQL, calls this endpoint to get vectors, then
// substitutes them as vector literals before forwarding the SQL to
// the server. So the server's /mcp becomes a pure SQL executor for
// daemon-equipped machines and the laptop's running model is the
// canonical source for query vectors too (not just stored ones).

import type { Hono } from "hono";
import { Logger, mnemeRoute } from "@mneme/core";
import { embedBatch } from "../embed.ts";

export function mountEmbedRoute(app: Hono): void {
  app.post("/embed", mnemeRoute("daemon.embed_route"), async (c) => {
    const body = (await c.req.json().catch(() => null)) as { texts?: unknown } | null;
    if (!body || !Array.isArray(body.texts)) {
      Logger.warn("embed: invalid body");
      return c.json({ error: "texts[] required" }, 400);
    }
    const texts = body.texts.filter((t): t is string => typeof t === "string");
    Logger.info("embed request", { count: texts.length });
    try {
      const t0 = Date.now();
      const vectors = await embedBatch(texts);
      Logger.info("embed result", {
        count: vectors.length,
        duration_ms: Date.now() - t0,
      });
      return c.json({ vectors });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.error("embed failed", err, { count: texts.length });
      return c.json({ error: msg }, 500);
    }
  });
}
