// Force-run endpoint tests. isForceableWorker is pure; forceWorkerRun
// touches _ops.worker_runs and is DB-gated.

import { describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe("isForceableWorker", () => {
  test("accepts nap and digest only", async () => {
    const { isForceableWorker } = await import("../src/routes/ops.ts");
    expect(isForceableWorker("nap")).toBe(true);
    expect(isForceableWorker("digest")).toBe(true);
    for (const n of ["dream", "keepalive", "prune", "", "NAP", "../x"]) {
      expect(isForceableWorker(n)).toBe(false);
    }
  });
});

describe("forceWorkerRun: bad name", () => {
  test("returns a 400 result for an unknown worker", async () => {
    const { forceWorkerRun } = await import("../src/routes/ops.ts");
    const r = await forceWorkerRun("bogus");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
});

describe.skipIf(!HAS_DB)("forceWorkerRun: DB (requires DATABASE_URL)", () => {
  test("digest: advances next_run_at to now and clears last_status", async () => {
    const { forceWorkerRun } = await import("../src/routes/ops.ts");
    const { sql } = await import("../src/infra/db.ts");

    const [before] = await sql<
      { next_run_at: Date; last_status: string | null; last_error: string | null }[]
    >`
      SELECT next_run_at, last_status, last_error
      FROM _ops.worker_runs WHERE job_name = 'digest'
    `;
    if (!before) return; // digest not registered in this deployment; nothing to assert

    try {
      const r = await forceWorkerRun("digest");
      expect(r.ok).toBe(true);
      const [after] = await sql<{ next_run_at: Date; last_status: string | null }[]>`
        SELECT next_run_at, last_status FROM _ops.worker_runs WHERE job_name = 'digest'
      `;
      expect(after!.last_status).toBeNull();
      expect(Date.now() - new Date(after!.next_run_at).getTime()).toBeLessThan(10_000);
    } finally {
      // Restore so the real digest schedule is not perturbed by the test.
      await sql`
        UPDATE _ops.worker_runs
        SET next_run_at = ${before.next_run_at},
            last_status = ${before.last_status},
            last_error = ${before.last_error}
        WHERE job_name = 'digest'
      `;
    }
  });
});
