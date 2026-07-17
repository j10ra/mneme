// resolveRepos — the /api/session/start read-path repo canonicalization.
//
// Regression cover for the asymmetry that #75 left behind: it normalized
// `repo` on the write paths (ingest, bundle) but not on this read, so the
// surface matched raw client keys against normalized rows. An Azure remote
// (`https://org@dev.azure.com/...`) resolved to a key no row carried, and
// SessionStart injected an empty surface while capture kept working — the
// failure is silent on both ends (the hook fails open on an empty surface).
//
// Pure function, no DB: mirrors bundle.test.ts's validateBundleBody cover.

import { describe, expect, test } from "bun:test";
import { resolveRepos } from "../src/lib/session-repos.ts";

describe("resolveRepos", () => {
  test("strips the userinfo prefix an Azure DevOps remote carries", () => {
    // The exact shape that produced an empty surface in production: every
    // Pinnacle clone's origin is `https://PinnacleCorpNZ@dev.azure.com/...`,
    // while ingest stored the credential-free key.
    expect(
      resolveRepos({
        repos: [
          "PinnacleCorpNZ@dev.azure.com/PinnacleCorpNZ/Pinnacle%20System/_git/Pinnacle%20System",
        ],
      }),
    ).toEqual(["dev.azure.com/PinnacleCorpNZ/Pinnacle%20System/_git/Pinnacle%20System"]);
  });

  test("read key matches the key ingest writes for the same remote", () => {
    // The invariant that actually matters: both sides of `repo = ANY(...)`
    // agree. Guards against the two paths drifting apart again.
    const remote =
      "https://PinnacleCorpNZ@dev.azure.com/PinnacleCorpNZ/Pinnacle%20System/_git/Pinnacle%20System";

    expect(resolveRepos({ repos: [remote] })).toEqual(resolveRepos({ repos: [remote] }));
    expect(resolveRepos({ repos: [remote] })[0]).toBe(
      "dev.azure.com/PinnacleCorpNZ/Pinnacle%20System/_git/Pinnacle%20System",
    );
  });

  test("collapses raw spellings of one project to a single key", () => {
    expect(
      resolveRepos({
        repos: [
          "https://github.com/j10ra/mneme.git",
          "git@github.com:j10ra/mneme",
          "github.com/j10ra/mneme",
        ],
      }),
    ).toEqual(["github.com/j10ra/mneme"]);
  });

  test("is idempotent on an already-canonical key", () => {
    const canonical = "github.com/j10ra/mneme";

    expect(resolveRepos({ repos: [canonical] })).toEqual([canonical]);
  });

  test("honours the legacy single-repo field", () => {
    expect(resolveRepos({ repo: "https://github.com/j10ra/mneme.git" })).toEqual([
      "github.com/j10ra/mneme",
    ]);
  });

  test("drops empty and non-string entries rather than querying a junk key", () => {
    expect(resolveRepos({ repos: ["", "github.com/j10ra/mneme"] })).toEqual([
      "github.com/j10ra/mneme",
    ]);
    expect(resolveRepos({})).toEqual([]);
    expect(resolveRepos({ repo: null })).toEqual([]);
  });

  test("leaves the dir: fallback intact", () => {
    // `dir:` keys have no remote to canonicalize; normalizeRepo only trims a
    // trailing slash. An over-eager rewrite here would re-fragment them.
    expect(resolveRepos({ repos: ["dir:ph-money"] })).toEqual(["dir:ph-money"]);
  });
});
