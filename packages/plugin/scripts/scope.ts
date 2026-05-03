// Shared scope helpers for hook.ts and slash.ts.

import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { hostname } from "node:os";
import { basename, join } from "node:path";
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

/**
 * Walk cwd for sub-repositories (Pinnacle-style multi-repo workspaces and
 * git worktrees). Used at SessionStart so the surface can union across all
 * sub-repos when the workspace root is itself not a git repo.
 *
 * Strategy:
 *  1. cwd itself if it resolves to a canonical (non-`dir:`) repo.
 *  2. Immediate children with a `.git` entry (file or dir). Worktrees use a
 *     `.git` *file* pointing into a parent gitdir, but `git remote get-url`
 *     still works from inside them.
 *  3. The `wt/*` convention: one extra level under a `wt/` directory if it
 *     exists, to catch worktrees grouped by ticket number.
 *
 * Skips `dir:*` fallbacks — we want resolvable git URLs, not basename guesses.
 * Always returns the deduped set; an empty result means no git repos under cwd.
 */
export function discoverRepos(cwd: string): string[] {
  const out: string[] = [];

  const self = canonicalRepo(cwd);
  if (self && !self.startsWith("dir:")) out.push(self);

  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(cwd, { withFileTypes: true });
  } catch {
    return Array.from(new Set(out));
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    const child = join(cwd, entry.name);
    if (!existsSync(join(child, ".git"))) continue;
    const repo = canonicalRepo(child);
    if (repo && !repo.startsWith("dir:")) out.push(repo);
  }

  const wtDir = join(cwd, "wt");
  if (existsSync(wtDir)) {
    let wtEntries: import("node:fs").Dirent[];
    try {
      wtEntries = readdirSync(wtDir, { withFileTypes: true });
    } catch {
      return Array.from(new Set(out));
    }
    for (const entry of wtEntries) {
      if (!entry.isDirectory()) continue;
      const wt = join(wtDir, entry.name);
      if (!existsSync(join(wt, ".git"))) continue;
      const repo = canonicalRepo(wt);
      if (repo && !repo.startsWith("dir:")) out.push(repo);
    }
  }

  return Array.from(new Set(out));
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
