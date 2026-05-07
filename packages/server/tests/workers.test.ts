// SQL smoke tests for the worker layer. Same rationale as surface.test.ts:
// postgres-js tagged templates are strings; column-name typos pass
// `bun run typecheck` and only fail when the query actually executes.
//
// Coverage matrix:
//   ✅ extract  — runs the lock SELECT against an empty queue.
//   ✅ embed    — runs the lock SELECT against an empty queue.
//   ✅ keepalive — `SELECT 1`, always safe.
//   ⚠️  nap     — every cycle UPDATEs decay/shadow/related/resurrect/dead.
//                 Cannot run against the live DB without modifying state.
//                 Needs either a sandbox DATABASE_URL or factoring nap into
//                 testable read/write halves before it can be smoked.
//   ⚠️  dream   — conditional LLM calls + INSERT cluster rows. Same shape
//                 as nap; needs sandbox or refactor.
//
// Skipped if DATABASE_URL is unset (fresh clone, CI without a DB).

import { describe, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

// No afterAll teardown of the sql pool — see surface.test.ts for the
// reason (shared module-level pool across test files).

describe.skipIf(!HAS_DB)("worker SQL smoke (requires DATABASE_URL)", () => {
  test("runExtractOnce: lock SELECT runs against an empty queue", async () => {
    const { sql } = await import("../src/db.ts");
    // Bail if any extract job is pending — we don't want this test to
    // trigger a real LLM call against Boss's openrouter / local provider.
    // The SELECT itself still validates whenever the queue happens to be
    // empty, which is the common case in a quiet DB.
    const rows = await sql<{ n: string }[]>`
      SELECT COUNT(*)::text AS n FROM ingest_jobs
      WHERE phase = 'extract'
        AND attempts < 5
        AND scheduled_at <= now()
        AND state IN ('queued', 'error')
    `;
    const pending = Number(rows[0]?.n ?? 0);
    if (pending > 0) {
      console.log(
        `  skipping: ${pending} extract job(s) pending (would trigger LLM)`,
      );
      return;
    }
    const { runExtractOnce } = await import("../src/worker/extract.ts");
    // No throw = the lock SELECT (3 sub-queries inside one tx) is schema-valid.
    await runExtractOnce();
  });

  test("runEmbedOnce: lock SELECT runs against an empty queue", async () => {
    const { sql } = await import("../src/db.ts");
    const rows = await sql<{ n: string }[]>`
      SELECT COUNT(*)::text AS n FROM ingest_jobs
      WHERE phase = 'embed'
        AND memory_id IS NOT NULL
        AND attempts < 5
        AND scheduled_at <= now()
        AND state IN ('queued', 'error')
    `;
    const pending = Number(rows[0]?.n ?? 0);
    if (pending > 0) {
      console.log(
        `  skipping: ${pending} embed job(s) pending (would trigger embedder)`,
      );
      return;
    }
    const { runEmbedOnce } = await import("../src/worker/embed.ts");
    await runEmbedOnce();
  });

  test("runKeepaliveOnce: SELECT 1 against the configured DB", async () => {
    const { runKeepaliveOnce } = await import("../src/worker/keepalive.ts");
    await runKeepaliveOnce();
  });
});
