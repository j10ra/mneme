import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type ProjectEntry = { path: string; registered_at: string };

export type MnemeConfig = {
  server: { url: string };
  auth: { key: string };
  machine: { id: string; name?: string };
  projects?: ProjectEntry[];
  /** Daemon block, present once /mneme:setup has installed the daemon
   *  service. The hook checks for this and, when present, posts captures
   *  to the daemon at 127.0.0.1:port instead of the cloud server. */
  daemon?: { port: number; agent_provider: string };
};

export function configPath(): string {
  return join(homedir(), ".mneme", "config.json");
}

export function loadConfig(): MnemeConfig {
  const path = configPath();
  const raw = readFileSync(path, "utf8");
  const cfg = JSON.parse(raw) as MnemeConfig;
  if (!cfg.server?.url) throw new Error("config missing server.url");
  if (!cfg.auth?.key) throw new Error("config missing auth.key");
  if (!cfg.machine?.id) throw new Error("config missing machine.id");
  return cfg;
}

export function serverUrl(cfg: MnemeConfig, path: string): string {
  return `${cfg.server.url.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Paths we never auto-register. Anything under these is treated as ghost
// agent activity (claude-mem observers, transient subprocess workdirs, etc).
// The .claude* pattern intentionally covers .claude, .claude-mem, and any
// future hidden-dir convention used by Claude-adjacent tooling.
const BLACKLIST_PATTERNS: RegExp[] = [
  /\/\.claude[a-z0-9_-]*(\/|$)/,
  /^\/tmp(\/|$)/,
  /^\/var\/tmp(\/|$)/,
  /^\/private\/var\/folders(\/|$)/,
  /^\/proc(\/|$)/,
  /^\/sys(\/|$)/,
];

export function isBlacklistedPath(cwd: string): boolean {
  return BLACKLIST_PATTERNS.some((re) => re.test(cwd));
}

/** True if cwd is under a registered project root (exact or path-prefix match). */
export function isProjectRegistered(cfg: MnemeConfig, cwd: string): boolean {
  const projects = cfg.projects ?? [];
  return projects.some(
    (p) => cwd === p.path || cwd.startsWith(`${p.path}/`),
  );
}

/** Atomic config write: tempfile (mode 0600) + rename. POSIX rename is atomic
 *  on the same filesystem, and setting the mode at write time means the live
 *  config never sits at the default umask, even briefly. */
export function saveConfig(cfg: MnemeConfig): void {
  const path = configPath();
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, `${JSON.stringify(cfg, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(tmp, path);
}

/** Append cwd to config.projects[] if not already there. */
export function registerProject(cwd: string): boolean {
  const cfg = loadConfig();
  const projects = cfg.projects ?? [];
  if (projects.some((p) => p.path === cwd)) return false;
  projects.push({ path: cwd, registered_at: new Date().toISOString() });
  cfg.projects = projects;
  saveConfig(cfg);
  return true;
}
