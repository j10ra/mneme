#!/usr/bin/env bun
// Self-heal the launchd / systemd / Task Scheduler service config when
// /plugin update lands new daemon code in a new cache dir. Spawned
// detached from hook.ts SessionStart when refreshDaemonIfStale() sees
// the plist target doesn't match this script's own pluginRoot.
//
// What this does:
//   1. Loads ~/.mneme/config.json (must already exist — the FIRST
//      install path requires admin password and stays on /mneme:setup).
//   2. Calls installDaemonService with the current pluginRoot derived
//      from import.meta.url. That generator:
//        - runs `bun install --production` if node_modules is missing
//          in the new cache dir (one-time cost per plugin version)
//        - rewrites the plist to point at <currentPluginRoot>/daemon.js
//        - launchctl unload + load → daemon respawns on new code
//   3. Logs a one-line audit trail to ~/.mneme/logs/refresh.log so the
//      operator can see when self-heal fired.
//
// Failure modes:
//   - config.json missing → exit silently (no first-install bootstrap
//     possible; operator must run /mneme:setup with admin pw)
//   - install scaffolding error → log it, exit 0 (don't disturb CC)
//   - bun install hangs → no recourse here, but it's running
//     detached from CC's SessionStart so the user isn't blocked

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installDaemonService, pickFreePortDeterministic } from "./daemon-install.ts";

const LOG = join(homedir(), ".mneme", "logs", "refresh.log");
const PIDFILE = join(homedir(), ".mneme", "refresh.pid");

// CC's SessionStart hook can fire twice in rapid succession on
// /plugin update + /reload-plugins + /exit + new session — we observed
// two refresh-daemon procs spawning ~5s apart, each launching its own
// `bun install --production` for the same node_modules dir, racing
// each other to populate it. On a throttled network, both hang.
// Single-flight via a pidfile: if another refresh is already running
// (its pid is alive), bail.
//
// Stale pidfile (process gone) is treated as no lock — overwrite and
// proceed. The pidfile is removed on graceful exit.
// Sized just above ensurePluginDeps' 5-min bun install hard timeout.
// A legitimate install on a healthy network completes in seconds; the
// long tail (corp Zscaler throttling the npm registry) hits the 5-min
// SIGKILL inside ensurePluginDeps and then the holder exits, releasing
// the lock. So a 6-minute stale-lock window means: legitimate runs are
// never stolen, hung holders surface fast and get superseded by the
// next SessionStart's refresh attempt.
const STALE_LOCK_AGE_MS = 6 * 60 * 1000;

function isProcessAlive(pid: number): boolean {
  try {
    // Sending signal 0 doesn't kill, just checks reachability.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function logLine(msg: string): void {
  try {
    const dir = dirname(LOG);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`);
  } catch {
    // logging is best-effort
  }
}

function tryAcquireLock(): boolean {
  if (existsSync(PIDFILE)) {
    let prev: { pid: number; ts: string } | null = null;
    try {
      prev = JSON.parse(readFileSync(PIDFILE, "utf8"));
    } catch {
      prev = null;
    }
    if (prev && isProcessAlive(prev.pid)) {
      const age = Date.now() - new Date(prev.ts).getTime();
      if (age < STALE_LOCK_AGE_MS) {
        logLine(`refresh: skipped (lock held by pid ${prev.pid})`);
        return false;
      }
      logLine(
        `refresh: stale lock (pid ${prev.pid} alive ${Math.round(age / 1000)}s); taking over`,
      );
    }
  }
  try {
    mkdirSync(dirname(PIDFILE), { recursive: true });
    writeFileSync(PIDFILE, JSON.stringify({ pid: process.pid, ts: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

function releaseLock(): void {
  try {
    rmSync(PIDFILE, { force: true });
  } catch {
    // best-effort
  }
}

async function main(): Promise<void> {
  if (!tryAcquireLock()) return;
  try {
    await runRefresh();
  } finally {
    releaseLock();
  }
}

async function runRefresh(): Promise<void> {
  const cfgPath = join(homedir(), ".mneme", "config.json");
  if (!existsSync(cfgPath)) {
    logLine("refresh: no config; run /mneme:setup first");
    return;
  }
  let cfg: { machine?: { id?: string }; daemon?: { port?: number } };
  try {
    cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  } catch (err) {
    logLine(`refresh: config parse failed — ${err instanceof Error ? err.message : err}`);
    return;
  }
  if (!cfg.machine?.id) {
    logLine("refresh: config missing machine.id; run /mneme:setup");
    return;
  }
  const daemonPort = cfg.daemon?.port ?? pickFreePortDeterministic(cfg.machine.id);

  // Derive the current plugin root from this script's own location.
  // refresh-daemon.ts lives at <pluginRoot>/scripts/refresh-daemon.ts.
  const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));

  logLine(`refresh: starting — pluginRoot=${pluginRoot} port=${daemonPort}`);
  try {
    const result = await installDaemonService({
      pluginRoot,
      daemonPort,
      bunPath: process.execPath,
    });
    if (result.ok) {
      logLine(`refresh: success — service at ${result.servicePath}`);
    } else {
      logLine(`refresh: install error — ${result.error}`);
    }
  } catch (err) {
    logLine(`refresh: crash — ${err instanceof Error ? err.message : String(err)}`);
  }
}

main().catch((err) => {
  logLine(`refresh: top-level — ${err instanceof Error ? err.message : err}`);
  process.exit(0);
});
