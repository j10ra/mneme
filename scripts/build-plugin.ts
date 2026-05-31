#!/usr/bin/env bun
// Build the plugin's daemon bundle.
//
// The plugin (`packages/plugin/`) is what ships to Claude Code's plugin
// cache when a user runs `/plugin install`. CC's marketplace fetches
// only the plugin source path declared in `.claude-plugin/marketplace.json`
// — for us, that's `./packages/plugin/`. So the daemon source at
// `packages/daemon/` doesn't ride along by default.
//
// This script bundles the daemon entry into a single self-contained
// JS file that lives inside `packages/plugin/`. Workspace deps
// (`@mneme/core`, `@mneme/daemon` internals) are inlined; native deps
// (`@xenova/transformers`, `@anthropic-ai/claude-agent-sdk`, `hono`)
// stay external and are installed at first launch via `bun install`
// from `packages/plugin/package.json`.
//
// Run before bumping `packages/plugin/.claude-plugin/plugin.json`
// version. The bundle MUST be committed to git so CC's marketplace
// fetch picks it up.

import { $ } from "bun";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const entry = join(repoRoot, "packages/daemon/src/index.ts");
const outfile = join(repoRoot, "packages/plugin/daemon.js");
const workerEntry = join(repoRoot, "packages/daemon/src/embed-worker.ts");
const workerOutfile = join(repoRoot, "packages/plugin/embed-worker.js");

if (!existsSync(entry)) {
  console.error(`daemon entry missing: ${entry}`);
  process.exit(1);
}

if (!existsSync(workerEntry)) {
  console.error(`embed-worker entry missing: ${workerEntry}`);
  process.exit(1);
}

// Native or otherwise-not-bundleable deps stay external. They live in
// `<pluginRoot>/node_modules/` after `bun install` runs at setup time.
// hono / postgres / sdk all have prebuilt platform binaries or registry
// quirks we don't want to inline.
const externals = [
  "@xenova/transformers",
  "onnxruntime-node",
  "onnxruntime-common",
  "sharp",
  "@anthropic-ai/claude-agent-sdk",
  "@anthropic-ai/claude-code",
  "hono",
  "postgres",
];

const externalArgs = externals.flatMap((p) => ["--external", p]);

console.log(`bundling ${entry} → ${outfile}`);
await $`bun build ${entry} --target=bun ${externalArgs} --outfile=${outfile}`;
const daemonSize = await Bun.file(outfile).size;

console.log(`✓ daemon bundle: ${(daemonSize / 1024).toFixed(1)} KB`);

// embed-worker is a separate subprocess entry (see #33). It runs the
// ONNX session in isolation so the daemon's RSS stays bounded.
console.log(`bundling ${workerEntry} → ${workerOutfile}`);
await $`bun build ${workerEntry} --target=bun ${externalArgs} --outfile=${workerOutfile}`;
const workerSize = await Bun.file(workerOutfile).size;

console.log(`✓ embed-worker bundle: ${(workerSize / 1024).toFixed(1)} KB`);

console.log(
  `next: bump packages/plugin/.claude-plugin/plugin.json version, commit daemon.js + embed-worker.js + package.json`,
);
