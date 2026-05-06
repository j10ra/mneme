// Asserts the committed plugin scrub bundle (packages/plugin/scripts/scrub.ts)
// matches a fresh `bun build` of packages/shared/src/scrub.ts. The plugin
// is shipped as-is via /plugin install — no bun install at the destination
// — so the bundle MUST be in the repo and MUST be current. A drift here
// means the plugin is scrubbing with stale secret patterns.
//
// Fix locally with: bun run build:plugin-scrub

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

describe("plugin scrub bundle", () => {
  test("committed bundle matches fresh build of shared/src/scrub.ts", () => {
    const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
    const committed = readFileSync(
      join(repoRoot, "packages/plugin/scripts/scrub.ts"),
      "utf8",
    );

    const tmp = mkdtempSync(join(tmpdir(), "mneme-bundle-"));
    try {
      const out = join(tmp, "scrub.ts");
      const result = spawnSync(
        "bun",
        [
          "build",
          "packages/shared/src/scrub.ts",
          "--outfile",
          out,
          "--format",
          "esm",
          "--target",
          "bun",
          "--banner",
          "// @ts-nocheck",
        ],
        { cwd: repoRoot, stdio: "pipe" },
      );
      expect(result.status).toBe(0);
      const fresh = readFileSync(out, "utf8");
      expect(committed).toBe(fresh);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
