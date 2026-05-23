// Shared logger for plugin scripts (hook.ts, slash.ts, mcp-proxy.ts).
//
// Appends to ~/.mneme/logs/daemon.log — the same file the daemon
// writes to and the dashboard's `/dashboard/api/logs/stream` SSE tails.
// macOS / Linux `O_APPEND` is atomic for writes < PIPE_BUF (≥ 4 KiB on
// every platform we run on), so multiple writers (the daemon process
// plus N transient hook/slash/mcp subprocesses) don't interleave for
// our typically-sub-KiB log lines.
//
// Format matches the daemon's Logger output:
//   HH:MM:SS.mmm LEVEL source: msg [k=v ...]
// so the dashboard log panel renders one consistent stream.
//
// Never throws — if the file or directory can't be written (sandbox,
// quota, race), the call silently drops. Callers should not depend on
// log delivery.

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const LOG_PATH = join(homedir(), ".mneme", "logs", "daemon.log");
let dirChecked = false;

function ensureDir(): void {
  if (dirChecked) return;
  try {
    const dir = dirname(LOG_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  } catch {
    /* drop */
  }
  dirChecked = true;
}

type Level = "INFO" | "WARN" | "ERROR" | "DEBUG";

function fmtFields(fields?: Record<string, unknown>): string {
  if (!fields) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    const s = typeof v === "string" ? v : JSON.stringify(v);
    parts.push(`${k}=${s}`);
  }
  return parts.length ? " " + parts.join(" ") : "";
}

/** Append one log line to daemon.log. Format mirrors the daemon's Logger.
 *  `source` is a short dotted path identifying the origin (e.g.
 *  "hook.session_start", "slash.handoff", "mcp.sql"). */
export function plog(
  level: Level,
  source: string,
  msg: string,
  fields?: Record<string, unknown>,
): void {
  ensureDir();
  const ts = new Date().toISOString().slice(11, 23);
  const line = `${ts} ${level.padEnd(5)} ${source}: ${msg}${fmtFields(fields)}\n`;
  try {
    appendFileSync(LOG_PATH, line);
  } catch {
    /* never block on logging */
  }
}
