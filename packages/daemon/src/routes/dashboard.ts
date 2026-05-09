// Local dashboard at http://127.0.0.1:<daemon_port>/dashboard.
//
// Two static routes serve the pre-built React SPA, plus dynamic
// /dashboard/api/* endpoints proxy to the server (using cfg.auth.key,
// the per-machine bearer) so the daemon never holds admin credentials.
// Local-only data (this machine's logs, outbox state) is read directly
// from disk by the daemon — no server round-trip.
//
// Loopback-only security: the daemon binds to 127.0.0.1, so anything
// reaching these routes is already inside the machine boundary. No
// dashboard-side auth.
//
// Source of truth for the bundled assets is `<plugin-root>/dashboard/
// dist/`, produced by `packages/plugin/dashboard/build.ts` and
// committed by CI. This route just reads them at request time — no
// caching, no bundling, no build step inside the daemon.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Hono } from "hono";
import { Logger, mnemeRoute } from "@mneme/core";

/** Absolute path to `<plugin-root>/dashboard/dist/`.
 *  Resolution order:
 *    1. MNEME_PLUGIN_ROOT env var (injected at install time, like
 *       CLAUDE_EXECUTABLE_PATH) — bulletproof when present.
 *    2. Walk known relative shapes from this module's URL:
 *       - dev: packages/daemon/src/routes/ → packages/plugin/dashboard/dist
 *       - production bundle: <plugin-root>/daemon.js → <plugin-root>/dashboard/dist
 *    3. If nothing exists, return the most-likely path so callers get
 *       a clear 503 with the path they should have built.
 */
function dashboardDist(): string {
  const fromEnv = process.env.MNEME_PLUGIN_ROOT;
  if (fromEnv && fromEnv.trim()) {
    const p = join(fromEnv.trim(), "dashboard", "dist");
    if (existsSync(join(p, "index.html"))) return p;
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    // dev: packages/daemon/src/routes/ → packages/plugin/dashboard/dist
    join(here, "..", "..", "..", "..", "packages", "plugin", "dashboard", "dist"),
    // production: <plugin-root>/daemon.js (sibling)
    join(here, "dashboard", "dist"),
    // bundle one-level (defensive)
    join(here, "..", "dashboard", "dist"),
  ];
  for (const p of candidates) {
    if (existsSync(join(p, "index.html"))) return p;
  }
  return candidates[1]!;
}

const NOT_BUILT_HTML = `<!doctype html>
<html><head><title>Mneme dashboard</title>
<style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:600px;margin:auto;color:#333}</style>
</head><body>
<h1>Dashboard not built</h1>
<p>The dashboard's <code>dist/</code> wasn't found at the expected path.
This usually means either the plugin was installed before CI rebuilt
the bundle, or you're running from a fresh dev checkout where
<code>packages/plugin/dashboard/dist/</code> hasn't been generated yet.</p>
<p>To build locally:</p>
<pre>cd packages/plugin/dashboard &amp;&amp; bun install &amp;&amp; bun run build</pre>
<p>Then re-run <code>/plugin update mneme</code> &amp; <code>/reload-plugins</code>.</p>
</body></html>`;

export function mountDashboardRoutes(app: Hono): void {
  const distDir = dashboardDist();

  // GET /dashboard → index.html
  app.get("/dashboard", mnemeRoute("daemon.dashboard"), async (c) => {
    const indexPath = join(distDir, "index.html");
    if (!existsSync(indexPath)) {
      Logger.warn("dashboard: dist/index.html not found", undefined, {
        looked_at: indexPath,
      });
      return c.html(NOT_BUILT_HTML, 503);
    }
    return c.html(await Bun.file(indexPath).text());
  });

  // GET /dashboard/bundle.js → minified JS
  app.get("/dashboard/bundle.js", async (c) => {
    const bundlePath = join(distDir, "bundle.js");
    if (!existsSync(bundlePath)) {
      return c.text("// dashboard bundle not built", 503);
    }
    const bytes = await Bun.file(bundlePath).bytes();
    return c.body(bytes, 200, {
      "content-type": "application/javascript; charset=utf-8",
      // No long-cache: dashboard updates ride the plugin update cycle,
      // and a stale cache would confuse the operator. Short cache is
      // enough to avoid double-fetch within one page render.
      "cache-control": "no-cache",
    });
  });

  // ── /dashboard/api/* — JSON endpoints ───────────────────────────
  // Pattern: each endpoint either proxies to the server using
  // cfg.auth.key, or reads local-only data from disk. No auth on
  // the dashboard side (loopback-only).

  // GET /dashboard/api/status — proxies /api/_ops/status (now read-scoped)
  // First endpoint wired; more land per the dashboard ticket.
  app.get(
    "/dashboard/api/status",
    mnemeRoute("daemon.dashboard.status"),
    async (c) => {
      const cfg = await readDaemonConfig();
      if (!cfg) {
        return c.json({ error: "config not loaded" }, 503);
      }
      try {
        const resp = await fetch(`${cfg.serverUrl}/api/_ops/status`, {
          headers: { Authorization: `Bearer ${cfg.token}` },
        });
        const body = await resp.text();
        return c.body(body, resp.status as 200, {
          "content-type":
            resp.headers.get("content-type") ?? "application/json",
        });
      } catch (err) {
        Logger.warn("dashboard.status: upstream fetch failed", err);
        return c.json(
          { error: "upstream unavailable" },
          502,
        );
      }
    },
  );
}

// Lazy-read of ~/.mneme/config.json so we always pick up the latest
// token after rotation. The slash dispatcher uses a similar pattern.
type DaemonProxyConfig = { serverUrl: string; token: string };

async function readDaemonConfig(): Promise<DaemonProxyConfig | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { homedir } = await import("node:os");
    const path = join(homedir(), ".mneme", "config.json");
    const raw = await readFile(path, "utf8");
    const cfg = JSON.parse(raw) as {
      server?: { url?: string };
      auth?: { key?: string };
    };
    if (!cfg.server?.url || !cfg.auth?.key) return null;
    return {
      serverUrl: cfg.server.url.replace(/\/$/, ""),
      token: cfg.auth.key,
    };
  } catch {
    return null;
  }
}
