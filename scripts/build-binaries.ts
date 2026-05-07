#!/usr/bin/env bun
// Cross-compile the daemon entry into per-platform standalone
// executables via `bun build --compile --target=bun-<os>-<arch>`.
//
// Output: dist/binaries/mneme-daemon-<platform>-<arch> (no extension)
//   dist/binaries/mneme-daemon-darwin-arm64
//   dist/binaries/mneme-daemon-darwin-x64
//   dist/binaries/mneme-daemon-linux-x64
//   dist/binaries/mneme-daemon-linux-arm64
//
// Each binary is self-contained: the native deps that the bun-run path
// needs (`@xenova/transformers`, `@anthropic-ai/claude-agent-sdk`, etc)
// are bundled inside. So the install path on the target machine is just
// "download → chmod +x → launch via plist" with no `bun install` step.
//
// Sizes are large (~60MB darwin, ~100MB linux) but each binary only
// downloads once per (machine, version) and stays cached at
// ~/.mneme/bin/mneme-daemon-v<version>.
//
// Run locally to validate; CI runs the same matrix on tag push and
// uploads to the GitHub release. The local script is also useful for
// the developer rolling out to their own laptops without waiting on CI.

import { $ } from "bun";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const entry = join(repoRoot, "packages/daemon/src/index.ts");
const outDir = join(repoRoot, "dist/binaries");

// Platforms we ship binaries for. Add Windows once we have a tester
// reporting back; the daemon already has a Task Scheduler XML path
// in daemon-install.ts but no one's exercised it yet.
const TARGETS = [
  { target: "bun-darwin-arm64", filename: "mneme-daemon-darwin-arm64" },
  { target: "bun-darwin-x64",   filename: "mneme-daemon-darwin-x64" },
  { target: "bun-linux-x64",    filename: "mneme-daemon-linux-x64" },
  { target: "bun-linux-arm64",  filename: "mneme-daemon-linux-arm64" },
] as const;

if (!existsSync(entry)) {
  console.error(`daemon entry missing: ${entry}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// `bun build --compile` writes the outfile relative to cwd, so chdir
// into outDir before each target. Easier than juggling paths.
const originalCwd = process.cwd();
process.chdir(outDir);

let allOk = true;
for (const { target, filename } of TARGETS) {
  const start = Date.now();
  try {
    await $`bun build --compile --target=${target} ${entry} --outfile=${filename}`.quiet();
    const size = statSync(filename).size;
    const mb = (size / 1024 / 1024).toFixed(1);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✓ ${filename}  ${mb} MB  (${elapsed}s)`);
  } catch (err) {
    console.error(
      `✗ ${filename}: ${err instanceof Error ? err.message : String(err)}`,
    );
    allOk = false;
  }
}

process.chdir(originalCwd);

if (!allOk) {
  console.error("one or more targets failed");
  process.exit(1);
}

console.log(`\nbinaries written to ${outDir}`);
console.log(
  "next: tag the release and run `gh release upload v<version> dist/binaries/* --clobber`",
);
