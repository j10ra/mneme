import { Hono } from "hono";
import {
  Logger,
  TraceStore,
  configureAuth,
  configureLogger,
  configureTraceStore,
  getTraceStore,
  mnemeRoute,
} from "@mneme/core";
import { mountAuthRoutes } from "./routes/auth.ts";
import { mountBundleRoute } from "./routes/bundle.ts";
import { mountDreamRoutes } from "./routes/dream.ts";
import { mountHeartbeatRoute } from "./routes/heartbeat.ts";
import { mountIngestRoutes } from "./routes/ingest.ts";
import { mountMcpRoutes } from "./routes/mcp.ts";
import { mountSessionRoutes } from "./routes/session.ts";
import { sql } from "./infra/db.ts";
import { scrubData } from "@mneme/shared";
import { env } from "./infra/env.ts";
import { startWorker, stopWorker } from "./worker/index.ts";

// Wire core to DB and env. Scrubber runs on every span input/output so
// `_ops.spans` never see raw secrets either.
configureLogger({
  jsonMode: env.IS_PRODUCTION,
  minLevel: "debug",
});
configureAuth(sql);
configureTraceStore(new TraceStore({ sql, scrubber: scrubData }));

const app = new Hono();

// /health — public, no auth, no scope check.
app.get("/health", mnemeRoute("health"), (c) =>
  c.json({ status: "ok", phase: 0 }),
);

mountAuthRoutes(app);
mountBundleRoute(app);
mountDreamRoutes(app);
mountHeartbeatRoute(app);
mountIngestRoutes(app);
mountSessionRoutes(app);
mountMcpRoutes(app);

const port = env.PORT;

async function shutdown(signal: string): Promise<void> {
  Logger.info(`${signal} received, flushing traces and closing pool`);
  await stopWorker();
  try {
    await getTraceStore()?.stop();
  } finally {
    await sql.end({ timeout: 5 });
  }
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

startWorker();

Logger.info(`mneme server listening on :${port}`);

// idleTimeout: 0 disables Bun's default 10s connection idle cutoff.
// /api/dream/candidates can run multi-second (HNSW lookups against
// thousands of memories), and even capped at 500 candidates the
// query takes ~15s. With the default cutoff the connection dies
// mid-query and Railway's edge serves 502. Setting 0 lets long
// queries complete; client-side timeouts (daemon's fetch) bound the
// other end.
export default { port, fetch: app.fetch, idleTimeout: 0 };
