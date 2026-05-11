#!/usr/bin/env bun
// PostToolUse hook: format the file an agent just edited via Edit/Write/MultiEdit.
// Reads Claude Code's hook payload from stdin, extracts file_path, runs biome on it.
// Always exits 0 so a format failure never blocks the next agent action.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { extname, resolve } from "node:path";

const FORMATTABLE = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".css",
]);

const SKIP_PREFIXES = [
  "packages/plugin/dashboard/dist/",
  "packages/plugin/scripts/scrub.ts",
  "packages/plugin/scripts/embed-worker.js",
  "packages/plugin/daemon.js",
  "migrations/",
  "node_modules/",
];

async function main(): Promise<void> {
  const raw = await Bun.stdin.text();
  if (!raw.trim()) return;

  let payload: { tool_input?: { file_path?: string } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const filePath = payload.tool_input?.file_path;
  if (!filePath) return;

  const ext = extname(filePath).toLowerCase();
  if (!FORMATTABLE.has(ext)) return;

  const repoRoot = resolve(import.meta.dir, "..");
  const rel = filePath.startsWith(repoRoot) ? filePath.slice(repoRoot.length + 1) : filePath;
  if (SKIP_PREFIXES.some((p) => rel.startsWith(p))) return;
  if (!existsSync(filePath)) return;

  spawnSync("bunx", ["--bun", "biome", "format", "--write", filePath], {
    cwd: repoRoot,
    stdio: "ignore",
  });
}

main().catch(() => {});
