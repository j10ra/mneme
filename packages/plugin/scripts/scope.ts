// Shared scope helpers for hook.ts and slash.ts.

import { execSync } from "node:child_process";
import { hostname } from "node:os";
import type { MnemeConfig } from "./config.ts";

export function canonicalRepo(cwd?: string): string | null {
  try {
    const url = execSync("git remote get-url origin", {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
      cwd: cwd ?? process.cwd(),
    }).trim();
    if (!url) return null;
    const ssh = /^git@([^:]+):(.+?)(?:\.git)?$/.exec(url);
    if (ssh) return `${ssh[1]}/${ssh[2]}`;
    const https = /^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/.exec(url);
    if (https) return `${https[1]}/${https[2]}`;
    return url;
  } catch {
    return null;
  }
}

export type BaseScope = {
  machine_id: string;
  hostname: string;
  repo: string | null;
  harness: string;
  agent: string | null;
};

export function baseScope(
  cfg: MnemeConfig,
  cwd?: string,
): BaseScope {
  return {
    machine_id: cfg.machine.id,
    hostname: hostname(),
    repo: canonicalRepo(cwd),
    harness: "claude-code",
    agent:
      typeof process.env.CLAUDE_MODEL === "string"
        ? process.env.CLAUDE_MODEL
        : null,
  };
}
