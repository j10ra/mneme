// Daemon install scaffolding. Generates platform-specific service
// configurations (launchd plist on darwin, systemd unit on linux, Task
// Scheduler XML on win32) and the install / uninstall procedures that
// register them with the OS service manager.
//
// Phase 1: the daemon binary is an entry point in the user's local
// mneme checkout. Set MNEME_REPO_PATH or pass --repo-path to point at
// it. A future PR ships pre-built per-platform binaries via GitHub
// releases so install can be repo-free.
//
// All file generators are pure: given a config, they return a string.
// The execute paths (install / uninstall / start) are isolated so tests
// can cover the generators without touching the real service manager.

import { homedir } from "node:os";
import { join } from "node:path";

export type DaemonInstallConfig = {
  /** Absolute path to the directory containing packages/daemon/src/index.ts */
  repoPath: string;
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
  const daemonEntry = join(cfg.repoPath, "packages/daemon/src/index.ts");
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
  const daemonEntry = join(cfg.repoPath, "packages/daemon/src/index.ts");
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
  const daemonEntry = join(cfg.repoPath, "packages/daemon/src/index.ts");
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

  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { dirname } = await import("node:path");
  const { spawn } = await import("node:child_process");

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
        const proc = spawn("sh", ["-c", cmd], {
          stdio: ["ignore", "pipe", "pipe"],
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
