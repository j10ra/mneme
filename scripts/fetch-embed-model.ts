#!/usr/bin/env bun
// Bake the bge-small embedder into the image at build time so the server
// never downloads it at runtime (#59). Writes into <cwd>/.embed-cache —
// the same dir packages/server/src/lib/embedder.ts points transformers.js
// at — so a connector's first semantic query is a warm load, not a fetch.

import { join } from "node:path";

process.env.MNEME_EMBED_CACHE_DIR ??= join(process.cwd(), ".embed-cache");

// Relative, not "@mneme/embed": this script runs from the repo root where
// the root package doesn't declare the workspace dep.
const { prefetch } = await import("../packages/embed/src/index.ts");
const t0 = Date.now();

await prefetch();

console.log(`embed model baked into ${process.env.MNEME_EMBED_CACHE_DIR} (${Date.now() - t0}ms)`);
