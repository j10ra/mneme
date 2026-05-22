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
