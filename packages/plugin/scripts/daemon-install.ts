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
// (We had a pre-built standalone-binary path on a previous version but
// `bun build --compile` doesn't ship native dylibs cleanly and the
// embedder kept dlopen-failing inside the binary. Reverted to bun-run
// since every CC plugin host already has bun installed.)
//
// All file generators are pure: given a config, they return a string.
// The execute paths (install / uninstall / start) are isolated so tests
// can cover the generators without touching the real service manager.

import { homedir } from "node:os";
import { join } from "node:path";

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
};

const DEFAULT_LABEL = "dev.mneme.daemon";

export function buildLaunchdPlist(cfg: DaemonInstallConfig): string {
  const label = cfg.serviceLabel ?? DEFAULT_LABEL;
  const daemonEntry = join(cfg.pluginRoot, "daemon.js");
  const logsDir = join(homedir(), ".mneme", "logs");
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
  <string>${logsDir}/daemon.out.log</string>
  <key>StandardErrorPath</key>
  <string>${logsDir}/daemon.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>${homedir()}</string>
  </dict>
</dict>
</plist>
`;
}

export function buildSystemdUnit(cfg: DaemonInstallConfig): string {
  const daemonEntry = join(cfg.pluginRoot, "daemon.js");
  return `[Unit]
Description=Mneme daemon (per-machine extract + push)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${cfg.bunPath} run ${daemonEntry}
Restart=on-failure
RestartSec=5
Environment=HOME=${homedir()}

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
      return join(
        homedir(),
        ".config/systemd/user/mneme-daemon.service",
      );
    case "win32":
      return join(homedir(), "AppData/Roaming/Mneme/daemon/task.xml");
  }
}

export function buildServiceConfig(
  platform: Platform,
  cfg: DaemonInstallConfig,
): string {
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

// Run `bun install --production` inside pluginRoot to populate
// node_modules adjacent to daemon.js. Bun resolves the bundle's
// externals from there at runtime. Skips if node_modules already
// exists (idempotent re-setup) unless force=true.
async function ensurePluginDeps(
  pluginRoot: string,
  bunPath: string,
  force = false,
): Promise<{ ok: boolean; error?: string }> {
  const { existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { spawn } = await import("node:child_process");
  const nm = join(pluginRoot, "node_modules");
  if (!force && existsSync(nm)) {
    return { ok: true };
  }
  const result = await new Promise<{ code: number | null; stderr: string }>(
    (resolve) => {
      const proc = spawn(bunPath, ["install", "--production"], {
        cwd: pluginRoot,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stderr = "";
      proc.stderr.on("data", (b) => (stderr += b.toString()));
      proc.on("close", (code) => resolve({ code, stderr }));
      proc.on("error", () => resolve({ code: -1, stderr: "spawn failed" }));
    },
  );
  if (result.code !== 0) {
    return { ok: false, error: `bun install failed: ${result.stderr.slice(0, 400)}` };
  }
  return { ok: true };
}

// Write the service config and run the start commands. Best-effort: any
// failure logs a clear message and returns ok=false rather than throwing,
// so /mneme:setup doesn't bail on a service-manager wrinkle and leave
// the user in a half-configured state.
export async function installDaemonService(
  cfg: DaemonInstallConfig,
): Promise<InstallResult> {
  const platform = detectPlatform();
  const servicePath = serviceConfigPath(platform);
  const config = buildServiceConfig(platform, cfg);

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
    const result = await new Promise<{ code: number | null; stderr: string }>(
      (resolve) => {
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
      },
    );
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
