import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
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
  daemon?: { port: number; agent_provider: string; claudeOauthToken?: string };
  /** Optional admin block. Present only on machines where the operator
   *  ran /mneme:setup with the admin password and wants admin slash
   *  commands (machines/revoke/status) to run without re-prompting.
   *
   *  Stored as ciphertext, not plaintext: AES-256-GCM with the key
   *  derived from this machine's hardware fingerprint (the same
   *  IOPlatformUUID / machine-id / MachineGuid we already use to
   *  re-attach machine_id on re-setup). The blob is useless if exfil'd
   *  without the machine — main defense against backup / cloud-sync
   *  leaks of ~/.mneme/. Same 600 file as auth.key.
   *
   *  Format: base64( iv[12] | tag[16] | ciphertext ).
   *
   *  Absence means admin slashes fall back to MNEME_ADMIN_PASSWORD env
   *  var or a one-shot stdin prompt. */
  admin?: { secret: string };
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
  return projects.some((p) => cwd === p.path || cwd.startsWith(`${p.path}/`));
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

/** Stable per-machine identifier so re-installing the plugin maps back
 *  to the same DB row instead of creating a zombie alongside it.
 *
 *  - darwin: IOPlatformUUID from ioreg (survives OS reinstall on same
 *    hardware; tied to the SMC, not the disk).
 *  - linux: /etc/machine-id (systemd / dbus convention; persists across
 *    reboots, regenerated on disk image clone).
 *  - win32: HKLM\SOFTWARE\Microsoft\Cryptography MachineGuid (Windows-
 *    canonical hardware-ish id).
 *
 *  Returns null on probe failure rather than throwing. The caller (slash
 *  setup) treats null as "old behavior" — the server still mints a fresh
 *  machine_id, which is the correct fallback for an unknown environment.
 */
export function machineFingerprint(): string | null {
  try {
    const p = platform();
    if (p === "darwin") {
      const out = execFileSync("ioreg", ["-d2", "-c", "IOPlatformExpertDevice"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 2000,
      });
      const match = out.match(/IOPlatformUUID["\s=]+"([0-9A-Fa-f-]{36})"/);
      return match?.[1]?.toLowerCase() ?? null;
    }
    if (p === "linux") {
      for (const path of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
        if (existsSync(path)) {
          const id = readFileSync(path, "utf8").trim();
          if (/^[0-9a-f]{32}$/.test(id)) return id;
        }
      }
      return null;
    }
    if (p === "win32") {
      const result = spawnSync(
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
