// SQL smoke tests for surface. postgres-js tagged templates are strings —
// `bun run typecheck` does NOT validate column names against the live
// schema. A column-name typo passes typecheck but explodes at request
// time (see commit 4b305ca: `captures.created_at` → `captured_at`).
// These tests run `buildSurface` against a real DB so that class of bug
// fails at `bun test` instead of in production logs.
//
// Skipped if DATABASE_URL is unset (fresh clone, CI without a DB).

import { describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

// Pools (sql, readerSql) are module-level singletons shared with other
// test files. Calling sql.end() in afterAll would close the pool for
// any test file that runs after this one. Bun process exit cleans up
// connections; explicit teardown is unnecessary and harmful here.

describe.skipIf(!HAS_DB)("surface — SQL smoke (requires DATABASE_URL)", () => {
  test("every query runs against an empty-repo path", async () => {
    const { buildSurface } = await import("../src/services/surface.ts");
    // A repo guaranteed to have no memories. The five base queries plus
    // the supersede counter all execute against an empty result set; if
    // any column name is wrong, postgres throws.
    const result = await buildSurface(
      ["mneme://test/nonexistent-repo-smoke"],
      null,
    );
    expect(result.repos).toEqual(["mneme://test/nonexistent-repo-smoke"]);
    // computeDelta short-circuits without a prior summary, so its inner
    // count queries don't fire on this path. The populated test below
    // covers them.
    expect(result.delta).toBeNull();
  });

  test("populated-data path runs computeDelta's count queries", async () => {
    const { sql } = await import("../src/infra/db.ts");
    // Discover any repo with at least one `summary` memory so computeDelta
    // proceeds past its no-summary early-return and actually executes the
    // captures + memories count queries. Without this branch, an
    // empty-repo smoke alone would NOT have caught the captured_at bug.
    const rows = await sql<{ repo: string }[]>`
      SELECT DISTINCT repo FROM memories
      WHERE kind = 'summary' AND repo IS NOT NULL AND archived_at IS NULL
      LIMIT 1
    `;
    if (rows.length === 0) {
      // No data in this DB to exercise the populated path. The empty-repo
      // test still ran. Don't fail — this is informational on a fresh DB.
      console.log("  no repo with summaries found; populated path skipped");
      return;
    }
    const repo = rows[0]!.repo;
    const { buildSurface } = await import("../src/services/surface.ts");
    const result = await buildSurface([repo], null);
    expect(result.repos).toEqual([repo]);
    // Delta must be non-null (we just confirmed a summary exists), which
    // proves both count queries fired without a SQL error.
    expect(result.delta).not.toBeNull();
  });
});
