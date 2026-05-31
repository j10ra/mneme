// SQL smoke tests for the server-side worker layer.
//
// Server's tight extract+embed loops retired in #29 Phase B — those tests
// went with them since their query shape now lives only in the daemon's
// runtime. The remaining server-side workers:
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
  test("runKeepaliveOnce: SELECT 1 against the configured DB", async () => {
    const { runKeepaliveOnce } = await import("../src/worker/keepalive.ts");

    await runKeepaliveOnce();
  });
});
