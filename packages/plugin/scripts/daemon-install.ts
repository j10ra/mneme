// Daemon install scaffolding. Generates platform-specific service
// configurations (launchd plist on darwin, systemd unit on linux, Task
// Scheduler XML on win32) and the install / uninstall procedures that
// register them with the OS service manager.
//
// Single delivery mode: bun-run. The plist / systemd unit / Windows
// Task XML invokes `bun run <pluginRoot>/daemon.js`, with native deps
// resolved from `<pluginRoot>/node_modules/` (populated by `bun install
// --production` at install time). Works on macOS, WSL, Linux, and
// Windows because every platform path goes through the same launcher.
//
// All file generators are pure: given a config, they return a string.
// The execute paths (install / uninstall / start) are isolated so tests
// can cover the generators without touching the real service manager.

import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

/** Resolve an absolute path to the `claude` CLI at install time so it
 *  can be baked into the service config. Without this, the daemon
 *  inherits whatever PATH the service manager hands it (systemd's
 *  default user PATH excludes ~/.nvm/versions/node/<v>/bin, where
 *  npm-installed claude often lives). The daemon's runtime resolver
 *  reads CLAUDE_EXECUTABLE_PATH first, so injecting an absolute path
 *  here makes the daemon claude-find regardless of the service
 *  manager's PATH conventions.
 *
 *  Returns null when nothing found — the runtime resolver still has
 *  its own fallback list and may resolve at runtime via `which` if
 *  the daemon's process happens to have a usable PATH.
 */
export function findClaudeBinary(): string | null {
  // 1. Honor an explicitly set env var (operator override).
  if (process.env.CLAUDE_EXECUTABLE_PATH) {
    if (existsSync(process.env.CLAUDE_EXECUTABLE_PATH)) {
      return process.env.CLAUDE_EXECUTABLE_PATH;
    }
  }
  // 2. Walk the install-time shell PATH (`which`/`where`). Slash
  //    commands run inside CC's spawn context, which has the user's
  //    interactive PATH — so this catches nvm / asdf / pyenv-shimmed
  //    install locations.
  const probe = process.platform === "win32" ? "where" : "which";
  try {
    const r = spawnSync(probe, ["claude"], { encoding: "utf8" });
    if (r.status === 0) {
      const first = (r.stdout ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .find((s) => s.length > 0);
      if (first && existsSync(first)) return first;
    }
  } catch {
    // probe missing or PATH lookup failed; fall through to fallbacks
  }
  // 3. Well-known install locations — same set as the runtime
  //    fallback in agents/claude.ts plus the nvm sweep that catches
  //    the most common Linux install path that the runtime list
  //    misses.
  const candidates: string[] = [
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
    `${homedir()}/.local/bin/claude`,
    `${homedir()}/.bun/bin/claude`,
  ];
  const nvmRoot = `${homedir()}/.nvm/versions/node`;
  try {
    if (existsSync(nvmRoot)) {
      for (const v of readdirSync(nvmRoot)) {
        candidates.push(`${nvmRoot}/${v}/bin/claude`);
      }
    }
  } catch {
    // ignore
  }
  for (const c of candidates) {
    try {
      if (existsSync(c)) return c;
    } catch {
      // ignore
    }
  }
  return null;
}

export type DaemonInstallConfig = {
  /** Absolute path to the plugin's root inside CC's plugin cache (or a
   *  developer checkout's packages/plugin/). The bundle lives at
   *  `<pluginRoot>/daemon.js` and node_modules at `<pluginRoot>/node_modules/`. */
  pluginRoot: string;
  /** Local TCP port the daemon listens on (127.0.0.1 only) */
  daemonPort: number;
  /** Path to the user's bun binary (e.g. ~/.bun/bin/bun) */
  bunPath: string;
  /** Service label / name used by the platform manager */
  serviceLabel?: string;
  /** Absolute path to the `claude` CLI; baked into the service's
   *  CLAUDE_EXECUTABLE_PATH env so the daemon can find it under
   *  service-manager-managed PATHs that don't include nvm/bun/.local.
   *  When omitted, generators omit the env var and the daemon falls
   *  back to its runtime resolver. */
  claudePath?: string;
};

const DEFAULT_LABEL = "dev.mneme.daemon";

export function buildLaunchdPlist(cfg: DaemonInstallConfig): string {
  const label = cfg.serviceLabel ?? DEFAULT_LABEL;
  const daemonEntry = join(cfg.pluginRoot, "daemon.js");
  const logsDir = join(homedir(), ".mneme", "logs");
  const claudeEnv = cfg.claudePath
    ? `\n    <key>CLAUDE_EXECUTABLE_PATH</key>\n    <string>${cfg.claudePath}</string>`
    : "";
  // MNEME_PLUGIN_ROOT lets the dashboard route resolve <plugin-root>/
  // dashboard/dist/ deterministically, regardless of how Bun bundles
  // import.meta.url. cfg.pluginRoot is already known at install time.
  const pluginRootEnv = `\n    <key>MNEME_PLUGIN_ROOT</key>\n    <string>${cfg.pluginRoot}</string>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${cfg.bunPath}</string>
    <string>run</string>
    <string>${daemonEntry}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${logsDir}/daemon.log</string>
  <key>StandardErrorPath</key>
  <string>${logsDir}/daemon.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>${homedir()}</string>${pluginRootEnv}${claudeEnv}
  </dict>
</dict>
</plist>
`;
}

export function buildSystemdUnit(cfg: DaemonInstallConfig): string {
  const daemonEntry = join(cfg.pluginRoot, "daemon.js");
  // CLAUDE_EXECUTABLE_PATH gets baked in only when the install path
  // resolved an absolute claude binary. systemd's default user PATH
  // doesn't include ~/.nvm/versions/node/*/bin, where npm-installed
  // claude often lives — so without this env, findClaudeExecutable in
  // the daemon throws on every extract attempt.
  const claudeLine = cfg.claudePath ? `\nEnvironment=CLAUDE_EXECUTABLE_PATH=${cfg.claudePath}` : "";
  // MNEME_PLUGIN_ROOT lets the dashboard route resolve dist/ paths
  // deterministically across Bun bundle / dev source layouts.
  const pluginRootLine = `\nEnvironment=MNEME_PLUGIN_ROOT=${cfg.pluginRoot}`;
  return `[Unit]
Description=Mneme daemon (per-machine extract + push)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${cfg.bunPath} run ${daemonEntry}
Restart=on-failure
RestartSec=5
StandardOutput=append:${homedir()}/.mneme/logs/daemon.log
StandardError=append:${homedir()}/.mneme/logs/daemon.log
Environment=HOME=${homedir()}${pluginRootLine}${claudeLine}

[Install]
WantedBy=default.target
`;
}

export function buildWindowsTaskXml(cfg: DaemonInstallConfig): string {
  const daemonEntry = join(cfg.pluginRoot, "daemon.js");
  const label = cfg.serviceLabel ?? DEFAULT_LABEL;
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>${label}</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Settings>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>9999</Count>
    </RestartOnFailure>
  </Settings>
  <Actions>
    <Exec>
      <Command>${cfg.bunPath}</Command>
      <Arguments>run ${daemonEntry}</Arguments>
    </Exec>
  </Actions>
</Task>
`;
}

export type Platform = "darwin" | "linux" | "win32";

export function detectPlatform(): Platform {
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "linux") return "linux";
  if (process.platform === "win32") return "win32";
  throw new Error(`unsupported platform: ${process.platform}`);
}

/** True when the on-disk service config (plist / systemd unit / Task XML)
 *  points at a daemon.js path that no longer matches the current
 *  pluginRoot. The hook calls this on every SessionStart and spawns
 *  refresh-daemon.ts when it returns true.
 *
 *  Returns false when:
 *    - The service config doesn't exist (no daemon installed yet — the
 *      caller is expected to have its own bootstrap flow, /mneme:setup)
 *    - The config exists and references the current pluginRoot
 *
 *  Pure function modulo `existsSync` + `readFileSync` so it's easy to
 *  unit-test against fixture content without touching real install paths.
 */
export function isDaemonConfigStale(
  pluginRoot: string,
  fs: {
    existsSync: (p: string) => boolean;
    readFileSync: (p: string, enc: "utf8") => string;
  } = { existsSync: requireFs().existsSync, readFileSync: requireFs().readFileSync },
  platform: Platform = detectPlatform(),
): boolean {
  // Use the platform-correct path separator so the comparison matches
  // what `installDaemonService` actually wrote — `join()` does this for
  // us (forward slash on darwin/linux, backslash on win32).
  const expectedDaemonEntry = join(pluginRoot, "daemon.js");
  const cfgPath = serviceConfigPath(platform);
  if (!fs.existsSync(cfgPath)) return false;
  let content: string;
  try {
    content = fs.readFileSync(cfgPath, "utf8");
  } catch {
    return false;
  }
  switch (platform) {
    case "darwin":
      // launchd plist: `<string>{daemonEntry}</string>` is the third
      // ProgramArguments element. Match the wrapper so we don't get
      // false positives from substring matches in another tag.
      return !content.includes(`<string>${expectedDaemonEntry}</string>`);
    case "linux":
      // systemd unit: `ExecStart={bunPath} run {daemonEntry}` — the
      // bunPath might also have changed between bun upgrades, so we
      // only assert on the daemon path, which is what determines code
      // version.
      return !content.includes(expectedDaemonEntry);
    case "win32":
      // Task Scheduler XML: `<Arguments>run {daemonEntry}</Arguments>`.
      // Same reasoning as linux — assert on the daemon path.
      return !content.includes(expectedDaemonEntry);
  }
}

// Defer the node:fs require so this module is still importable in
// environments that lazy-load fs (test runners with custom resolvers).
function requireFs(): {
  existsSync: (p: string) => boolean;
  readFileSync: (p: string, enc: "utf8") => string;
} {
  const fs = require("node:fs");
  return { existsSync: fs.existsSync, readFileSync: fs.readFileSync };
}

/** True when running inside Windows Subsystem for Linux. WSL exposes
 *  itself via env vars set by the WSL launcher, plus the kernel string
 *  in /proc/version. We use it to gate the linux/systemd install path:
 *  WSL without `systemd=true` in /etc/wsl.conf has no user systemd, so
 *  the daemon can't auto-start. */
export function isWSL(): boolean {
  if (process.platform !== "linux") return false;
  if (process.env.WSL_DISTRO_NAME) return true;
  if (process.env.WSL_INTEROP) return true;
  try {
    const { readFileSync } = require("node:fs");
    return /microsoft/i.test(readFileSync("/proc/version", "utf8"));
  } catch {
    return false;
  }
}

export function serviceConfigPath(platform: Platform): string {
  switch (platform) {
    case "darwin":
      return join(homedir(), "Library/LaunchAgents/dev.mneme.daemon.plist");
    case "linux":
      return join(homedir(), ".config/systemd/user/mneme-daemon.service");
    case "win32":
      return join(homedir(), "AppData/Roaming/Mneme/daemon/task.xml");
  }
}

export function buildServiceConfig(platform: Platform, cfg: DaemonInstallConfig): string {
  switch (platform) {
    case "darwin":
      return buildLaunchdPlist(cfg);
    case "linux":
      return buildSystemdUnit(cfg);
    case "win32":
      return buildWindowsTaskXml(cfg);
  }
}

// Returns the shell commands the operator must run to register and start
// the daemon. Kept out of execute() so install can be dry-run / inspected.
export function startCommandsFor(platform: Platform): string[] {
  switch (platform) {
    case "darwin":
      return [
        `launchctl unload ${serviceConfigPath("darwin")} 2>/dev/null || true`,
        `launchctl load ${serviceConfigPath("darwin")}`,
      ];
    case "linux":
      return [
        "systemctl --user daemon-reload",
        "systemctl --user enable mneme-daemon.service",
        "systemctl --user restart mneme-daemon.service",
      ];
    case "win32":
      return [
        `schtasks /Create /TN MnemeDaemon /XML "${serviceConfigPath("win32")}" /F`,
        `schtasks /Run /TN MnemeDaemon`,
      ];
  }
}

export type InstallResult = {
  ok: boolean;
  platform: Platform;
  servicePath: string;
  port: number;
  startedCommands: string[];
  error?: string;
};

/** A stable signature derived from the dep-relevant fields of a
 *  package.json. Used by findReusableNodeModules to decide whether two
 *  plugin versions resolve to the same node_modules tree.
 *
 *  Plugin patch bumps change the `"version"` field of the package.json
 *  itself but never touch deps, so a byte-equality compare would
 *  invalidate every reuse opportunity. Compare only the fields that
 *  actually drive what `bun install` materializes:
 *
 *    - dependencies, optionalDependencies, peerDependencies — direct
 *      drivers of resolution
 *    - trustedDependencies — affects which install scripts run
 *
 *  Falls back to the raw bytes if parsing fails so a malformed file
 *  is treated conservatively (no reuse).
 */
export function depsSignature(pkgJson: string): string {
  try {
    const pkg = JSON.parse(pkgJson) as Record<string, unknown>;
    const sig = {
      dependencies: pkg.dependencies ?? {},
      optionalDependencies: pkg.optionalDependencies ?? {},
      peerDependencies: pkg.peerDependencies ?? {},
      trustedDependencies: pkg.trustedDependencies ?? [],
    };
    return JSON.stringify(sig);
  } catch {
    return pkgJson;
  }
}

/** Absolute path to the shared, deps-signature-keyed dependency store
 *  for a plugin package.json. The store lives under ~/.mneme, OUTSIDE
 *  Claude Code's plugin cache, so CC pruning old plugin versions can
 *  never strip the daemon's node_modules out from under a running
 *  install (the historical wedge: `<pluginRoot>/node_modules` was a
 *  symlink into a sibling version that CC later garbage-collected).
 *
 *  Keying on depsSignature() means every plugin version whose deps
 *  resolve identically — the common case, since a patch bump touches
 *  only `version` — shares one install. A real dependency change
 *  yields a different signature, a different store dir, and a fresh
 *  install. */
export function pluginDepsStoreDir(pkgJson: string): string {
  const { createHash } = require("node:crypto");
  const hash = createHash("sha256").update(depsSignature(pkgJson)).digest("hex").slice(0, 16);
  return join(homedir(), ".mneme", "deps", hash);
}

/** True when `nmPath` resolves to a real directory holding every
 *  package named in `pkgJson`'s `dependencies`. Rejects a dangling
 *  symlink (realpathSync throws) and a half-finished `bun install`
 *  (a declared dep missing), so callers never trust a broken or
 *  partial node_modules. */
export function isPopulatedNodeModules(nmPath: string, pkgJson: string): boolean {
  const { existsSync, readdirSync, realpathSync, statSync } = require("node:fs");
  let real: string;
  try {
    real = realpathSync(nmPath);
    if (!statSync(real).isDirectory()) return false;
  } catch {
    return false; // missing path or dangling symlink
  }
  let deps: Record<string, unknown>;
  try {
    deps = (JSON.parse(pkgJson).dependencies ?? {}) as Record<string, unknown>;
  } catch {
    // Unparseable package.json: fall back to a bare non-empty check.
    return readdirSync(real).length > 0;
  }
  return Object.keys(deps).every((name) => existsSync(join(real, name)));
}

// Populate the plugin's dependency store and point
// `<pluginRoot>/node_modules` at it.
//
// The install itself lives in a shared, deps-signature-keyed store
// under ~/.mneme/deps/ (see pluginDepsStoreDir), NOT inside Claude
// Code's plugin cache. `<pluginRoot>/node_modules` is a symlink into
// that store; the daemon bundle resolves its native externals through
// it at runtime. Keeping the store outside CC's cache means CC pruning
// old plugin versions can never break a running daemon, and every
// version with the same deps reuses one install (sub-second relink vs.
// re-downloading ~2GB of native deps per patch bump).
//
// Idempotent: a populated store plus a correct symlink is a no-op.
// `force` re-runs the install even when the store looks populated.
async function ensurePluginDeps(
  pluginRoot: string,
  bunPath: string,
  force = false,
): Promise<{ ok: boolean; error?: string }> {
  const { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync } =
    await import("node:fs");
  const pkgPath = join(pluginRoot, "package.json");
  if (!existsSync(pkgPath)) {
    return { ok: false, error: `plugin package.json not found at ${pkgPath}` };
  }
  let pkgJson: string;
  try {
    pkgJson = readFileSync(pkgPath, "utf8");
  } catch (err) {
    return { ok: false, error: `cannot read ${pkgPath}: ${asMessage(err)}` };
  }

  const storeDir = pluginDepsStoreDir(pkgJson);
  const storeNm = join(storeDir, "node_modules");
  const nm = join(pluginRoot, "node_modules");

  // 1. Ensure the shared store is populated.
  if (force || !isPopulatedNodeModules(storeNm, pkgJson)) {
    try {
      mkdirSync(storeDir, { recursive: true });
      // `bun install` reads package.json from its cwd — give the store
      // its own copy so the install resolves the intended dep set.
      copyFileSync(pkgPath, join(storeDir, "package.json"));
    } catch (err) {
      return { ok: false, error: `cannot prepare deps store ${storeDir}: ${asMessage(err)}` };
    }
    const install = await runBunInstall(bunPath, storeDir);
    if (!install.ok) return install;
  }

  // 2. Point <pluginRoot>/node_modules at the store. A leftover entry
  //    here — a real dir from a pre-store install, or a dangling
  //    symlink from the old sibling-reuse scheme — must be cleared
  //    first: both `bun` and symlinkSync choke on a dangling link.
  let linkOk = false;
  try {
    linkOk = realpathSync(nm) === realpathSync(storeNm);
  } catch {
    // nm missing or dangling — leave linkOk false
  }
  if (!linkOk) {
    rmSync(nm, { recursive: true, force: true });
    try {
      // 'junction' is the cross-platform-safe choice: on win32 it's
      // a directory junction (no admin needed); on posix node ignores
      // the type hint and creates a symlink.
      symlinkSync(storeNm, nm, "junction");
    } catch (err) {
      return { ok: false, error: `cannot link ${nm} -> ${storeNm}: ${asMessage(err)}` };
    }
  }

  return { ok: true };
}

function asMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Run `bun install --production` in `cwd`. Hard timeout: a corporate
// proxy that mishandles TLS to the npm registry / Bun CDN (Zscaler is
// the observed offender) can hang the spawn indefinitely, which in
// turn traps the refresh-daemon's pidfile lock until the 30-min stale
// timeout. Five minutes is generous for a real install on a healthy
// network and short enough that a wedge surfaces early.
async function runBunInstall(
  bunPath: string,
  cwd: string,
): Promise<{ ok: boolean; error?: string }> {
  const { spawn } = await import("node:child_process");
  const INSTALL_TIMEOUT_MS = 5 * 60 * 1000;
  const result = await new Promise<{ code: number | null; stderr: string }>((resolve) => {
    const proc = spawn(bunPath, ["install", "--production"], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (b) => (stderr += b.toString()));
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        // ignore
      }
      resolve({
        code: -1,
        stderr: `bun install timed out after ${INSTALL_TIMEOUT_MS / 1000}s (corp proxy / network issue?)`,
      });
    }, INSTALL_TIMEOUT_MS);
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stderr });
    });
    proc.on("error", () => {
      clearTimeout(timer);
      resolve({ code: -1, stderr: "spawn failed" });
    });
  });
  if (result.code !== 0) {
    return { ok: false, error: `bun install failed: ${result.stderr.slice(0, 400)}` };
  }
  return { ok: true };
}

// Write the service config and run the start commands. Best-effort: any
// failure logs a clear message and returns ok=false rather than throwing,
// so /mneme:setup doesn't bail on a service-manager wrinkle and leave
// the user in a half-configured state.
export async function installDaemonService(cfg: DaemonInstallConfig): Promise<InstallResult> {
  const platform = detectPlatform();
  const servicePath = serviceConfigPath(platform);
  // Auto-resolve the claude binary when the caller didn't pin one. The
  // install-time PATH (the slash-command's interactive shell) usually
  // has nvm/asdf/bun shims that the runtime daemon's PATH lacks.
  const resolvedCfg: DaemonInstallConfig = {
    ...cfg,
    claudePath: cfg.claudePath ?? findClaudeBinary() ?? undefined,
  };
  const config = buildServiceConfig(platform, resolvedCfg);

  const { existsSync, mkdirSync, writeFileSync } = await import("node:fs");
  const { dirname, join: joinPath } = await import("node:path");
  const { spawn } = await import("node:child_process");

  // Sanity-check the bundle is actually present at the expected path.
  // Surfacing this early gives a clear error instead of a launchd
  // failure 30s later when the daemon process can't find its entry.
  const daemonBundle = joinPath(cfg.pluginRoot, "daemon.js");
  if (!existsSync(daemonBundle)) {
    return {
      ok: false,
      platform,
      servicePath,
      port: cfg.daemonPort,
      startedCommands: [],
      error: `daemon bundle missing at ${daemonBundle} (run scripts/build-plugin.ts before tagging)`,
    };
  }

  // WSL guard: linux platform path uses systemctl --user. WSL distros
  // older than the systemd-enabled releases (or any WSL where the user
  // hasn't opted in via /etc/wsl.conf) have no user systemd, so the
  // launchctl-equivalent step would silently fail with "Failed to
  // connect to bus." Fail loud here with the actual fix instead.
  if (platform === "linux" && isWSL()) {
    const probe = spawn("systemctl", ["--user", "is-system-running"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const probeResult = await new Promise<number | null>((resolve) => {
      probe.on("close", (code) => resolve(code));
      probe.on("error", () => resolve(-1));
    });
    if (probeResult !== 0 && probeResult !== 1) {
      // 0 = running, 1 = degraded; both mean systemd-user works.
      return {
        ok: false,
        platform,
        servicePath,
        port: cfg.daemonPort,
        startedCommands: [],
        error:
          "WSL detected without systemd-user. Add `[boot]\\nsystemd=true` to /etc/wsl.conf, run `wsl --shutdown` from PowerShell, restart your distro, then re-run /mneme:setup.",
      };
    }
  }

  // Populate node_modules at pluginRoot before launchctl load, so the
  // daemon process has its native externals resolvable at startup.
  const depsResult = await ensurePluginDeps(cfg.pluginRoot, cfg.bunPath);
  if (!depsResult.ok) {
    return {
      ok: false,
      platform,
      servicePath,
      port: cfg.daemonPort,
      startedCommands: [],
      error: depsResult.error,
    };
  }

  try {
    mkdirSync(dirname(servicePath), { recursive: true, mode: 0o755 });
    const logsDir = `${homedir()}/.mneme/logs`;
    mkdirSync(logsDir, { recursive: true, mode: 0o755 });
    writeFileSync(servicePath, config, { mode: 0o644 });
  } catch (err) {
    return {
      ok: false,
      platform,
      servicePath,
      port: cfg.daemonPort,
      startedCommands: [],
      error: `failed to write service config: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const cmds = startCommandsFor(platform);
  const ran: string[] = [];
  for (const cmd of cmds) {
    const result = await new Promise<{ code: number | null; stderr: string }>((resolve) => {
      // shell: true picks /bin/sh on darwin/linux and cmd.exe on
      // win32, so the same install code path works on every platform
      // without having to choose a shell ourselves.
      const proc = spawn(cmd, {
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      });
      let stderr = "";
      proc.stderr.on("data", (b) => (stderr += b.toString()));
      proc.on("close", (code) => resolve({ code, stderr }));
      proc.on("error", () => resolve({ code: -1, stderr: "spawn failed" }));
    });
    ran.push(cmd);
    if (result.code !== 0) {
      return {
        ok: false,
        platform,
        servicePath,
        port: cfg.daemonPort,
        startedCommands: ran,
        error: `command failed (${cmd}): ${result.stderr.slice(0, 300)}`,
      };
    }
  }

  return {
    ok: true,
    platform,
    servicePath,
    port: cfg.daemonPort,
    startedCommands: ran,
  };
}

export function pickFreePortDeterministic(machineId: string): number {
  // Hash machine_id to a port in the user-port range to avoid clashes
  // across machines that might share a tunnel (rare for daemons but
  // cheap insurance). Range: 49152-65535 (ephemeral / dynamic).
  let h = 0;
  for (let i = 0; i < machineId.length; i++) {
    h = (h * 31 + machineId.charCodeAt(i)) | 0;
  }
  const u = h >>> 0;
  return 49152 + (u % (65535 - 49152));
}
