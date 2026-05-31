import { Hono } from "hono";
import { cors } from "hono/cors";
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
import { mountOAuthRoutes } from "./routes/oauth.ts";
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

// Defense-in-depth security headers (AppSec M-2). The API serves JSON
// only, so CSP locks down to none. The one exception is /authorize,
// which serves the OAuth owner-login HTML (#59) and needs inline styles
// + same-origin form submission — relaxed just for that path below.
const secured = secureHeaders({
  strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
  xContentTypeOptions: "nosniff",
  referrerPolicy: "no-referrer",
  contentSecurityPolicy: { defaultSrc: ["'none'"] },
});

app.use("*", async (c, next) => {
  if (c.req.path === "/authorize") {
    await next();
    // No `form-action`: the login form POSTs to /authorize and the server
    // 302s to the client's redirect_uri (claude.ai, a localhost port, or a
    // native custom scheme). `form-action 'self'` blocks that cross-origin
    // redirect in the browser. Omitting it leaves submission unrestricted —
    // form-action does NOT fall back to default-src — while default-src
    // 'none' still locks scripts/images/etc. The page is static, server-
    // rendered, with every dynamic value attribute-escaped.
    c.header(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'",
    );
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "no-referrer");

    return;
  }

  return secured(c, next);
});

// CORS for browser-based MCP clients (claude.ai web, ChatGPT) that fetch
// discovery metadata, register, exchange tokens, and call /mcp
// cross-origin. Bearer auth (not cookies), so a wildcard origin is safe.
const mcpCors = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type", "Mcp-Session-Id", "mcp-protocol-version"],
  exposeHeaders: ["WWW-Authenticate"],
  maxAge: 86_400,
});

app.use("/.well-known/*", mcpCors);
app.use("/register", mcpCors);
app.use("/token", mcpCors);
app.use("/mcp", mcpCors);

// /health — public, no auth, no scope check.
app.get("/health", mnemeRoute("health"), (c) => c.json({ status: "ok", phase: 0 }));

mountAuthRoutes(app);
mountOAuthRoutes(app);
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
Logger.info(
  env.SERVER_EMBED_ENABLED
    ? "server embedding enabled — connectors can run embed() semantic search"
    : "server embedding disabled (set MNEME_SERVER_EMBED=1 to enable connector semantic search)",
);

// 0 = no idle cutoff. /api/dream/candidates queries can run multi-second
// and Railway's edge serves 502 if Bun closes mid-query. Client-side
// timeouts (daemon's fetch) bound the other end.
export default { port, fetch: app.fetch, idleTimeout: 0 };
