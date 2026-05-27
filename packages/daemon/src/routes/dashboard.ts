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

import { existsSync, statSync } from "node:fs";
import { open as fsOpen } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context, Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { Logger, mnemeRoute } from "@mneme/core";
import type { DreamCycleResult } from "../dream.ts";
import { embedBatch } from "../embed.ts";

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

export function mountDashboardRoutes(app: Hono, forceDream: () => Promise<DreamCycleResult>): void {
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

  // GET /dashboard/<filename>.js → entry bundle or lazy-loaded chunks
  //
  // Code-splitting puts dynamic imports (e.g. cytoscape from the
  // Graph tab) in separate <name>-<hash>.js files. We serve any .js
  // file in dist/ here, but reject path traversal and non-js requests
  // so the route can't be coerced into reading other files.
  app.get("/dashboard/:filename", async (c) => {
    const filename = c.req.param("filename");
    if (!filename.endsWith(".js") || filename.includes("/") || filename.includes("..")) {
      return c.notFound();
    }
    const filePath = join(distDir, filename);
    if (!existsSync(filePath)) {
      return c.text("// not found", 404);
    }
    const bytes = await Bun.file(filePath).bytes();
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

  // GET /dashboard/api/status — proxies /api/_ops/status (read-scoped)
  app.get(
    "/dashboard/api/status",
    mnemeRoute("daemon.dashboard.status"),
    proxyHandler("/api/_ops/status", "dashboard.status"),
  );

  // POST /dashboard/api/worker/:name/run — force one worker cycle.
  // nap | digest: proxy a POST to the server's force endpoint. dream:
  // run a forced cycle locally in the background and return 202 --
  // dream distills via the LLM and can take minutes, so a synchronous
  // response would hang the request.
  app.post(
    "/dashboard/api/worker/:name/run",
    mnemeRoute("daemon.dashboard.worker_run"),
    async (c) => {
      const name = c.req.param("name");
      if (name === "dream") {
        void forceDream().catch((err) => {
          Logger.error("dashboard: forced dream cycle failed", err);
        });
        return c.json({ queued: true, job: "dream" }, 202);
      }
      if (name === "nap" || name === "digest") {
        const cfg = await readDaemonConfig();
        if (!cfg) return c.json({ error: "config not loaded" }, 503);
        try {
          const resp = await fetch(`${cfg.serverUrl}/api/_ops/worker/${name}/run`, {
            method: "POST",
            headers: { Authorization: `Bearer ${bearerFor(cfg, "admin")}` },
          });
          const body = await resp.text();
          return c.body(body, resp.status as 200, {
            "content-type": resp.headers.get("content-type") ?? "application/json",
          });
        } catch (err) {
          Logger.warn("dashboard.worker_run: upstream fetch failed", err);
          return c.json({ error: "upstream unavailable" }, 502);
        }
      }
      return c.json({ error: "unknown worker" }, 400);
    },
  );

  // GET /dashboard/api/machines — proxies /api/auth/machines (read-scoped).
  // Explicit "machine" scope: /api/auth/machines is one of the few server
  // routes that's still read-scoped — gating it to admin would force a
  // password prompt just to list machines, which is over-strict.
  app.get(
    "/dashboard/api/machines",
    mnemeRoute("daemon.dashboard.machines"),
    proxyHandler("/api/auth/machines", "dashboard.machines", "machine"),
  );

  // GET /dashboard/api/daemon-schedule — local-only read of the
  // per-machine scheduler state. Dream + heartbeat + embedder-reap
  // run on the daemon (not the server), so their next_run_at lives
  // in ~/.mneme/schedule.json. The dashboard's Status panel merges
  // this with the server-side worker rows.
  app.get(
    "/dashboard/api/daemon-schedule",
    mnemeRoute("daemon.dashboard.daemon_schedule"),
    async (c) => {
      try {
        const { readFile } = await import("node:fs/promises");
        const path = join(homedir(), ".mneme", "schedule.json");
        const raw = await readFile(path, "utf8");
        return c.body(raw, 200, { "content-type": "application/json" });
      } catch (err) {
        Logger.warn("dashboard.daemon_schedule: read failed", err);
        return c.json({ error: "schedule unavailable" }, 503);
      }
    },
  );

  // GET /dashboard/api/server-logs — proxies /api/_ops/logs (read-scoped)
  // Forwards the query string verbatim so client-side filtering (since,
  // level, limit) flows through unchanged.
  app.get(
    "/dashboard/api/server-logs",
    mnemeRoute("daemon.dashboard.server_logs"),
    forwardQuery("/api/_ops/logs", "dashboard.server_logs"),
  );

  // ── Memories panel proxies (read-scoped on the server side) ──────
  // The list endpoint pre-embeds any ?q=<text> locally via the daemon's
  // bge-small subprocess and forwards as ?qvec=v1,v2,...&qkw=text — the
  // server no longer embeds anything itself. Other shapes (filters
  // only, no text search) pass through unchanged.
  app.get(
    "/dashboard/api/memories",
    mnemeRoute("daemon.dashboard.memories"),
    forwardMemoriesWithLocalEmbed(),
  );
  app.get(
    "/dashboard/api/memories/:id/related",
    mnemeRoute("daemon.dashboard.memories.related"),
    async (c) => {
      const id = c.req.param("id");
      return forwardPath(`/api/_ops/memories/${id}/related`, "dashboard.memories.related")(c);
    },
  );
  app.get(
    "/dashboard/api/memories/:id/supersede-chain",
    mnemeRoute("daemon.dashboard.memories.supersede_chain"),
    async (c) => {
      const id = c.req.param("id");
      return forwardPath(
        `/api/_ops/memories/${id}/supersede-chain`,
        "dashboard.memories.supersede_chain",
      )(c);
    },
  );
  app.get(
    "/dashboard/api/memories/:id/capture",
    mnemeRoute("daemon.dashboard.memories.capture"),
    async (c) => {
      const id = c.req.param("id");
      return forwardPath(`/api/_ops/memories/${id}/capture`, "dashboard.memories.capture")(c);
    },
  );
  app.get(
    "/dashboard/api/clusters",
    mnemeRoute("daemon.dashboard.clusters"),
    forwardQuery("/api/_ops/clusters", "dashboard.clusters"),
  );
  app.get(
    "/dashboard/api/graph",
    mnemeRoute("daemon.dashboard.graph"),
    forwardQuery("/api/_ops/graph", "dashboard.graph"),
  );

  // GET /dashboard/api/logs/stream — SSE tail of local daemon log files.
  // Reads ~/.mneme/logs/daemon.{out,err}.log directly (no server hop).
  // On connect: replays last N lines of each file. Then polls every
  // POLL_MS for new bytes, emits each line as an SSE event. Handles
  // rotation (size shrink → reset cursor to 0). Heartbeat ping every
  // 15s so proxies don't kill an idle connection.
  //
  // ?range=<ms>|all — caps backfill to lines newer than (now - ms).
  // When omitted or "all", falls back to the LOG_BACKFILL_MAX_LINES cap.
  app.get("/dashboard/api/logs/stream", mnemeRoute("daemon.dashboard.logs.stream"), (c) => {
    const rangeRaw = c.req.query("range");
    let rangeMs: number | null = null;
    if (rangeRaw && rangeRaw !== "all") {
      const n = Number(rangeRaw);
      if (Number.isFinite(n) && n > 0) rangeMs = n;
    }
    return streamSSE(c, async (stream) => streamLogs(stream, rangeMs));
  });
}

// ── proxy helper ────────────────────────────────────────────────────

// All /api/_ops/* routes are admin-scoped (AppSec #50). The dashboard
// runs locally so it can decrypt the admin block from ~/.mneme/config.json
// the same way slash commands do. Falls back to per-machine token only
// when no admin block exists on this machine — the server will then
// return 403 and the UI surfaces "admin password missing on this
// machine". `/api/auth/machines` is the one read-scope exception and
// uses "machine".
type ProxyScope = "admin" | "machine";
function bearerFor(cfg: DaemonProxyConfig, scope: ProxyScope): string {
  if (scope === "admin") return decryptAdminPassword(cfg.adminSecret) ?? cfg.token;
  return cfg.token;
}

function proxyHandler(upstreamPath: string, traceTag: string, scope: ProxyScope = "admin") {
  return async (c: Context) => {
    const cfg = await readDaemonConfig();
    if (!cfg) {
      return c.json({ error: "config not loaded" }, 503);
    }
    try {
      const resp = await fetch(`${cfg.serverUrl}${upstreamPath}`, {
        headers: { Authorization: `Bearer ${bearerFor(cfg, scope)}` },
      });
      const body = await resp.text();
      return c.body(body, resp.status as 200, {
        "content-type": resp.headers.get("content-type") ?? "application/json",
      });
    } catch (err) {
      Logger.warn(`${traceTag}: upstream fetch failed`, err);
      return c.json({ error: "upstream unavailable" }, 502);
    }
  };
}

/** Memories list proxy with local query embedding. Replaces the plain
 *  forwardQuery for this one endpoint because the server no longer
 *  embeds — q=text from the dashboard SPA gets converted to
 *  qvec=...&qkw=text by calling the local bge-small subprocess before
 *  forwarding upstream. Other params pass through. */
function forwardMemoriesWithLocalEmbed() {
  return async (c: Context) => {
    const cfg = await readDaemonConfig();
    if (!cfg) return c.json({ error: "config not loaded" }, 503);
    const url = new URL(c.req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q) {
      Logger.info("dashboard.memories: embedding query", {
        source: "dashboard:search",
        q_len: q.length,
      });
      try {
        const [vec] = await embedBatch([q]);
        if (vec && vec.length > 0) {
          url.searchParams.delete("q");
          url.searchParams.set("qvec", vec.join(","));
          url.searchParams.set("qkw", q);
        }
      } catch (err) {
        Logger.warn("dashboard.memories: local embed failed, dropping semantic search", err);
        url.searchParams.delete("q");
      }
    }
    try {
      const resp = await fetch(`${cfg.serverUrl}/api/_ops/memories${url.search}`, {
        headers: { Authorization: `Bearer ${bearerFor(cfg, "admin")}` },
      });
      const body = await resp.text();
      return c.body(body, resp.status as 200, {
        "content-type": resp.headers.get("content-type") ?? "application/json",
      });
    } catch (err) {
      Logger.warn("dashboard.memories: upstream fetch failed", err);
      return c.json({ error: "upstream unavailable" }, 502);
    }
  };
}

/** Forwards the incoming query string verbatim to a fixed upstream
 *  path. Used for the list-style endpoints (/memories, /clusters,
 *  /server-logs) where filters arrive as ?key=val. */
function forwardQuery(upstreamPath: string, traceTag: string, scope: ProxyScope = "admin") {
  return async (c: Context) => {
    const cfg = await readDaemonConfig();
    if (!cfg) return c.json({ error: "config not loaded" }, 503);
    const qs = new URL(c.req.url).search;
    try {
      const resp = await fetch(`${cfg.serverUrl}${upstreamPath}${qs}`, {
        headers: { Authorization: `Bearer ${bearerFor(cfg, scope)}` },
      });
      const body = await resp.text();
      return c.body(body, resp.status as 200, {
        "content-type": resp.headers.get("content-type") ?? "application/json",
      });
    } catch (err) {
      Logger.warn(`${traceTag}: upstream fetch failed`, err);
      return c.json({ error: "upstream unavailable" }, 502);
    }
  };
}

/** Forwards to a parameterised upstream path (id baked in). Used for
 *  per-memory lookups (/related, /supersede-chain, /capture). */
function forwardPath(upstreamPath: string, traceTag: string, scope: ProxyScope = "admin") {
  return async (c: Context) => {
    const cfg = await readDaemonConfig();
    if (!cfg) return c.json({ error: "config not loaded" }, 503);
    const qs = new URL(c.req.url).search;
    try {
      const resp = await fetch(`${cfg.serverUrl}${upstreamPath}${qs}`, {
        headers: { Authorization: `Bearer ${bearerFor(cfg, scope)}` },
      });
      const body = await resp.text();
      return c.body(body, resp.status as 200, {
        "content-type": resp.headers.get("content-type") ?? "application/json",
      });
    } catch (err) {
      Logger.warn(`${traceTag}: upstream fetch failed`, err);
      return c.json({ error: "upstream unavailable" }, 502);
    }
  };
}

// ── log streaming ───────────────────────────────────────────────────
//
// Tails the unified ~/.mneme/logs/daemon.log; fixed line cap matches
// actual recency.

const LOG_POLL_MS = 1000;
const LOG_PING_MS = 15_000;
// Backfill: bigger byte window when ?range=<ms> is set, plain tail-N
// otherwise.
const LOG_BACKFILL_BYTES = 256 * 1024;
const LOG_BACKFILL_BYTES_RANGE = 16 * 1024 * 1024;
const LOG_BACKFILL_MAX_LINES = 500;

function logPath(): string {
  return join(homedir(), ".mneme", "logs", "daemon.log");
}

/** Best-effort level inference from line text. The daemon writes plain
 *  `HH:MM:SS.ms LEVEL ...` lines, so a substring match is enough. */
function inferLevel(line: string): "debug" | "info" | "warn" | "error" {
  if (line.includes(" ERROR ")) return "error";
  if (line.includes(" WARN ")) return "warn";
  if (line.includes(" DEBUG ")) return "debug";
  return "info";
}

async function readTail(
  path: string,
  maxBytes: number,
): Promise<{
  text: string;
  size: number;
}> {
  if (!existsSync(path)) return { text: "", size: 0 };
  const st = statSync(path);
  const size = st.size;
  if (size === 0) return { text: "", size: 0 };
  const start = size > maxBytes ? size - maxBytes : 0;
  const fh = await fsOpen(path, "r");
  try {
    const buf = Buffer.alloc(size - start);
    await fh.read(buf, 0, buf.length, start);
    let text = buf.toString("utf8");
    if (start > 0) {
      const nl = text.indexOf("\n");
      if (nl >= 0) text = text.slice(nl + 1);
    }
    return { text, size };
  } finally {
    await fh.close();
  }
}

async function readNewBytes(
  path: string,
  fromByte: number,
): Promise<{
  text: string;
  size: number;
}> {
  if (!existsSync(path)) return { text: "", size: fromByte };
  const st = statSync(path);
  const size = st.size;
  if (size < fromByte) {
    // Rotation: file shrunk. Reset cursor by reading from 0 (cheap;
    // post-rotation the file is small).
    return readNewBytes(path, 0);
  }
  if (size === fromByte) return { text: "", size };
  const fh = await fsOpen(path, "r");
  try {
    const buf = Buffer.alloc(size - fromByte);
    await fh.read(buf, 0, buf.length, fromByte);
    return { text: buf.toString("utf8"), size };
  } finally {
    await fh.close();
  }
}

type SSEStream = Parameters<Parameters<typeof streamSSE>[1]>[0];

/** Parse the `HH:MM:SS.mmm` prefix the daemon logger writes (UTC, see
 *  packages/core/src/logger.ts). Returns null if the line doesn't start
 *  with one. The day component is lifted from `now` and rolled back if
 *  the parsed time is ahead of now (covers logs from yesterday). */
function lineTsMs(line: string, now: number): number | null {
  const m = line.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (!m) return null;
  const d = new Date(now);
  d.setUTCHours(+m[1]!, +m[2]!, +m[3]!, +m[4]!);
  if (d.getTime() > now + 60_000) d.setUTCDate(d.getUTCDate() - 1);
  return d.getTime();
}

async function streamLogs(stream: SSEStream, rangeMs: number | null): Promise<void> {
  const path = logPath();
  let cursor = 0;
  let id = 0;

  const send = async (line: string, isBackfill: boolean) => {
    if (!line) return;
    id++;
    await stream.writeSSE({
      id: String(id),
      event: "log",
      data: JSON.stringify({
        level: inferLevel(line),
        text: line,
        backfill: isBackfill,
      }),
    });
  };

  // ── 1. Backfill ──────────────────────────────────────────────────
  try {
    const readBytes = rangeMs !== null ? LOG_BACKFILL_BYTES_RANGE : LOG_BACKFILL_BYTES;
    const { text, size } = await readTail(path, readBytes);
    cursor = size;
    const allLines = text.split("\n");
    if (allLines.length && allLines[allLines.length - 1] === "") allLines.pop();
    let lines = allLines;
    if (rangeMs !== null) {
      // Range mode: keep only lines newer than the cutoff. Lines without
      // a parseable timestamp (rare — multi-line stack traces) tag along
      // with the most recent timestamped line via running fallback.
      const cutoff = Date.now() - rangeMs;
      const now = Date.now();
      const kept: string[] = [];
      let lastTs = 0;
      for (const ln of allLines) {
        const ts = lineTsMs(ln, now) ?? lastTs;
        if (ts) lastTs = ts;
        if (ts >= cutoff) kept.push(ln);
      }
      lines = kept;
    } else if (allLines.length > LOG_BACKFILL_MAX_LINES) {
      lines = allLines.slice(-LOG_BACKFILL_MAX_LINES);
    }
    for (const line of lines) {
      await send(line, true);
    }
  } catch (err) {
    Logger.warn("dashboard.logs.stream: backfill failed", err);
  }
  await stream.writeSSE({
    event: "ready",
    data: JSON.stringify({ at: new Date().toISOString() }),
  });

  // ── 2. Tail loop ─────────────────────────────────────────────────
  let lastPing = Date.now();
  while (!stream.aborted && !stream.closed) {
    try {
      const { text, size } = await readNewBytes(path, cursor);
      cursor = size;
      if (text) {
        // New bytes can include a trailing partial line. Hold back the
        // last segment (anything after the final \n) by rewinding the
        // cursor; we'll pick it up on the next tick when it's complete.
        const lastNl = text.lastIndexOf("\n");
        let consumed: string;
        if (lastNl < 0) {
          cursor = size - text.length;
          consumed = "";
        } else if (lastNl === text.length - 1) {
          consumed = text.slice(0, -1);
        } else {
          const partial = text.slice(lastNl + 1);
          cursor = size - partial.length;
          consumed = text.slice(0, lastNl);
        }
        if (consumed) {
          for (const line of consumed.split("\n")) {
            await send(line, false);
          }
        }
      }
    } catch (err) {
      Logger.warn("dashboard.logs.stream: tail failed", err);
    }
    if (Date.now() - lastPing > LOG_PING_MS) {
      await stream.writeSSE({
        event: "ping",
        data: String(Date.now()),
      });
      lastPing = Date.now();
    }
    await stream.sleep(LOG_POLL_MS);
  }
}

// Lazy-read of ~/.mneme/config.json so we always pick up the latest
// token after rotation. The slash dispatcher uses a similar pattern.
type DaemonProxyConfig = { serverUrl: string; token: string; adminSecret: string | null };

async function readDaemonConfig(): Promise<DaemonProxyConfig | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { homedir } = await import("node:os");
    const path = join(homedir(), ".mneme", "config.json");
    const raw = await readFile(path, "utf8");
    const cfg = JSON.parse(raw) as {
      server?: { url?: string };
      auth?: { key?: string };
      admin?: { secret?: string };
    };
    if (!cfg.server?.url || !cfg.auth?.key) return null;
    return {
      serverUrl: cfg.server.url.replace(/\/$/, ""),
      token: cfg.auth.key,
      adminSecret: cfg.admin?.secret ?? null,
    };
  } catch {
    return null;
  }
}

// Decrypt the AES-GCM-encrypted admin password from ~/.mneme/config.json.
// Mirrors packages/plugin/scripts/admin-secret.ts; duplicated here so the
// daemon is self-contained and doesn't reach across package boundaries.
// Returns null when no admin block is present, when the fingerprint is
// unavailable on this platform, or on auth-tag failure.
function decryptAdminPassword(blob: string | null): string | null {
  if (!blob) return null;
  try {
    const { createDecipheriv, scryptSync } = require("node:crypto");
    const { execFileSync, spawnSync } = require("node:child_process");
    const { existsSync, readFileSync } = require("node:fs");
    const { platform } = require("node:os");
    const fp = machineFingerprint(platform(), {
      execFileSync,
      spawnSync,
      existsSync,
      readFileSync,
    });
    if (!fp) return null;
    const SALT = Buffer.from("mneme-admin-secret-v1");
    const key = scryptSync(fp, SALT, 32);
    const buf = Buffer.from(blob, "base64");
    if (buf.length < 12 + 16 + 1) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    return null;
  }
}

// Mirrors packages/plugin/scripts/config.ts:machineFingerprint. Pure
// function, probes platform-canonical hardware ids. Same constraint:
// daemon stays self-contained.
function machineFingerprint(
  plat: NodeJS.Platform,
  fs: {
    execFileSync: (cmd: string, args: string[], opts: object) => string | Buffer;
    spawnSync: (
      cmd: string,
      args: string[],
      opts: object,
    ) => { status: number | null; stdout: string };
    existsSync: (p: string) => boolean;
    readFileSync: (p: string, enc: "utf8") => string;
  },
): string | null {
  try {
    if (plat === "darwin") {
      const out = fs.execFileSync("ioreg", ["-d2", "-c", "IOPlatformExpertDevice"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 2000,
      });
      const match = String(out).match(/IOPlatformUUID["\s=]+"([0-9A-Fa-f-]{36})"/);
      return match?.[1]?.toLowerCase() ?? null;
    }
    if (plat === "linux") {
      for (const p of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
        if (fs.existsSync(p)) {
          const id = fs.readFileSync(p, "utf8").trim();
          if (/^[0-9a-f]{32}$/.test(id)) return id;
        }
      }
      return null;
    }
    if (plat === "win32") {
      const result = fs.spawnSync(
        "reg",
        ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"],
        { encoding: "utf8", timeout: 2000 },
      );
      if (result.status !== 0) return null;
      const match = result.stdout.match(/MachineGuid\s+REG_SZ\s+([0-9A-Fa-f-]{36})/);
      return match?.[1]?.toLowerCase() ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
