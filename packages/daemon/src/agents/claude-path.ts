// Shared resolver for the local `claude` binary.
//
// Used by both the streaming and (deprecated) one-shot paths inside
// agents/. Lookup order:
//   1. CLAUDE_EXECUTABLE_PATH env var (operator override; baked into
//      the systemd unit / launchd plist by daemon-install.ts at
//      `/mneme:setup` time).
//   2. `which claude` in the daemon's PATH (typically empty on systemd-
//      user; populated on launchd via the plist's EnvironmentVariables).
//   3. Well-known install locations (homebrew, .local, .bun).
//   4. nvm version sweep at ~/.nvm/versions/node/<v>/bin/claude — npm-
//      installed claude lives here on Linux/WSL with nvm-managed node.
// Throws when none of the above turn up a real file.

import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

export function findClaudeExecutable(): string {
  if (process.env.CLAUDE_EXECUTABLE_PATH) {
    return process.env.CLAUDE_EXECUTABLE_PATH;
  }
  const which = spawnSync("which", ["claude"], { encoding: "utf8" });
  const fromPath = which.stdout?.trim();
  if (fromPath && existsSync(fromPath)) return fromPath;

  const fallbacks = [
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
    `${homedir()}/.local/bin/claude`,
    `${homedir()}/.bun/bin/claude`,
  ];
  try {
    const nvmRoot = `${homedir()}/.nvm/versions/node`;
    if (existsSync(nvmRoot)) {
      for (const v of readdirSync(nvmRoot)) {
        fallbacks.push(`${nvmRoot}/${v}/bin/claude`);
      }
    }
  } catch {
    // ignore
  }
  for (const candidate of fallbacks) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    "claude executable not found. Install Claude Code or set CLAUDE_EXECUTABLE_PATH.",
  );
}
