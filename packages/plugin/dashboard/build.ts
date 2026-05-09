#!/usr/bin/env bun
// Two-file dist builder for the dashboard.
//
//   dist/index.html   — index.html.template with <style> filled in
//   dist/bundle.js    — Bun-bundled, minified single JS bundle
//
// No `assets/` folder, no chunk hashing, no code splitting. The whole
// dashboard is one HTTP fetch (HTML) + one (JS). Daemon serves both
// directly out of dist/ at /dashboard and /dashboard/bundle.js.

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "src");
const DIST = join(HERE, "dist");
const TMP = join(HERE, ".tmp-build");

function clean(dir: string): void {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

clean(DIST);
clean(TMP);

// ── 1. JS bundle (Bun handles JSX/TSX natively) ──────────────────────
const jsResult = await Bun.build({
  entrypoints: [join(SRC, "main.tsx")],
  target: "browser",
  minify: true,
  outdir: TMP,
  naming: "bundle.js",
  // No splitting: one bundle, one network round-trip.
  splitting: false,
  // Strip React's dev-mode branches via constant folding.
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
if (!jsResult.success) {
  for (const log of jsResult.logs) console.error(log);
  throw new Error("dashboard: JS bundle failed");
}

// ── 2. Tailwind v4 CSS via @tailwindcss/cli ──────────────────────────
const cssIn = join(SRC, "styles.css");
const cssOut = join(TMP, "styles.css");
const cssProc = Bun.spawn(
  [
    "bunx",
    "@tailwindcss/cli",
    "--input",
    cssIn,
    "--output",
    cssOut,
    "--minify",
  ],
  { cwd: HERE, stdout: "inherit", stderr: "inherit" },
);
const cssExit = await cssProc.exited;
if (cssExit !== 0) {
  throw new Error(`dashboard: Tailwind build failed (exit ${cssExit})`);
}

// ── 3. Inline CSS into HTML template, write final dist/ ──────────────
const tmpl = await Bun.file(join(HERE, "index.html.template")).text();
const css = await Bun.file(cssOut).text();
const html = tmpl.replace("/* INLINE_CSS */", css);

await Bun.write(join(DIST, "index.html"), html);
await Bun.write(join(DIST, "bundle.js"), await Bun.file(join(TMP, "bundle.js")).bytes());

// ── 4. Cleanup tmp ───────────────────────────────────────────────────
rmSync(TMP, { recursive: true, force: true });

const htmlBytes = (await Bun.file(join(DIST, "index.html")).bytes()).byteLength;
const jsBytes = (await Bun.file(join(DIST, "bundle.js")).bytes()).byteLength;
console.log(
  `✓ dashboard built — index.html ${(htmlBytes / 1024).toFixed(1)}KB, ` +
    `bundle.js ${(jsBytes / 1024).toFixed(1)}KB`,
);
