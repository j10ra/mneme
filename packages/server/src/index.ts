import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
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
import { mountOpsRoutes } from "./routes/ops.ts";
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

// Defense-in-depth security headers (AppSec M-2). The API doesn't
// serve HTML, so CSP locks down to none — anything that tries to render
// a response in a browser context gets nothing. HSTS asserts the
// transport invariant for clients that respect it.
app.use(
  "*",
  secureHeaders({
    strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "no-referrer",
    contentSecurityPolicy: { defaultSrc: ["'none'"] },
  }),
);

// /health — public, no auth, no scope check.
app.get("/health", mnemeRoute("health"), (c) => c.json({ status: "ok", phase: 0 }));

mountAuthRoutes(app);
mountBundleRoute(app);
mountDreamRoutes(app);
mountHeartbeatRoute(app);
mountIngestRoutes(app);
mountOpsRoutes(app);
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

// 0 = no idle cutoff. /api/dream/candidates queries can run multi-second
// and Railway's edge serves 502 if Bun closes mid-query. Client-side
// timeouts (daemon's fetch) bound the other end.
export default { port, fetch: app.fetch, idleTimeout: 0 };
