#!/usr/bin/env bun
// Dist builder for the dashboard.
//
//   dist/index.html   — index.html.template with <style> filled in
//   dist/bundle.js    — main entry chunk
//   dist/<hash>.js    — lazy-loaded chunks (e.g. cytoscape pulled in
//                       by GraphCanvas's dynamic import)
//
// Code-splitting is enabled so heavy optional libs like cytoscape
// only download when the Graph tab is opened. The daemon's dashboard
// route serves any .js file in dist/ at /dashboard/<filename>.js.

import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
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
//
// Splitting is on so dynamic imports become separate chunks. Naming
// templates: the entry stays at "bundle.js" (the HTML <script>
// references it), chunks land at "<name>-<hash>.js" so the runtime
// loader fetches them by hashed name.
const jsResult = await Bun.build({
  entrypoints: [join(SRC, "main.tsx")],
  target: "browser",
  minify: true,
  outdir: TMP,
  naming: {
    entry: "bundle.js",
    chunk: "[name]-[hash].js",
    asset: "[name]-[hash][ext]",
  },
  splitting: true,
  // Strip React's dev-mode branches via constant folding, and inline
  // the plugin version so the SPA can render it in the header without
  // a runtime fetch.
  define: {
    "process.env.NODE_ENV": '"production"',
    __APP_VERSION__: JSON.stringify(
      ((await Bun.file(join(HERE, "..", "package.json")).json()) as { version: string }).version,
    ),
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
  ["bunx", "@tailwindcss/cli", "--input", cssIn, "--output", cssOut, "--minify"],
  { cwd: HERE, stdout: "inherit", stderr: "inherit" },
);
const cssExit = await cssProc.exited;
if (cssExit !== 0) {
  throw new Error(`dashboard: Tailwind build failed (exit ${cssExit})`);
}

// ── 3. Inline CSS into HTML template, copy all JS chunks to dist/ ───
const tmpl = await Bun.file(join(HERE, "index.html.template")).text();
const css = await Bun.file(cssOut).text();
const html = tmpl.replace("/* INLINE_CSS */", css);

await Bun.write(join(DIST, "index.html"), html);

let entryBytes = 0;
let chunkBytes = 0;
let chunkCount = 0;
for (const f of readdirSync(TMP)) {
  if (!f.endsWith(".js")) continue;
  const bytes = await Bun.file(join(TMP, f)).bytes();
  await Bun.write(join(DIST, f), bytes);
  if (f === "bundle.js") {
    entryBytes = bytes.byteLength;
  } else {
    chunkBytes += bytes.byteLength;
    chunkCount += 1;
  }
}

// ── 4. Cleanup tmp ───────────────────────────────────────────────────
rmSync(TMP, { recursive: true, force: true });

const htmlBytes = (await Bun.file(join(DIST, "index.html")).bytes()).byteLength;
console.log(
  `✓ dashboard built — index.html ${(htmlBytes / 1024).toFixed(1)}KB, ` +
    `bundle.js ${(entryBytes / 1024).toFixed(1)}KB` +
    (chunkCount > 0
      ? ` + ${chunkCount} chunk${chunkCount === 1 ? "" : "s"} ${(chunkBytes / 1024).toFixed(1)}KB`
      : ""),
);
