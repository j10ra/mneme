// Shared scope helpers for hook.ts and slash.ts.

import { execSync } from "node:child_process";
import { hostname } from "node:os";
import { basename } from "node:path";
import type { MnemeConfig } from "./config.ts";

/**
 * Derive a stable repo identifier from a working directory.
 *
 * Layered:
 *  1. `git remote get-url origin` -> canonical `host/path` (best; identical
 *     across machines, gives provenance).
 *  2. Fallback: basename of the working directory (e.g. `Pinnacle`). Works
 *     cross-machine as long as the directory name matches.
 *
 * Returns null only if cwd is empty, root, or unresolvable.
 */
export function canonicalRepo(cwd?: string): string | null {
  const workdir = cwd ?? process.cwd();
  if (!workdir) return null;

  try {
    const url = execSync("git remote get-url origin", {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
      cwd: workdir,
    }).trim();
    if (url) {
      const ssh = /^git@([^:]+):(.+?)(?:\.git)?$/.exec(url);
      if (ssh) return `${ssh[1]}/${ssh[2]}`;
      const https = /^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/.exec(url);
      if (https) return `${https[1]}/${https[2]}`;
      return url;
    }
  } catch {
    // git command failed (not a git repo, or no `origin` remote). Fall through.
  }

  const name = basename(workdir);
  if (!name || name === "/" || name === ".") return null;
  return `dir:${name}`;
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
