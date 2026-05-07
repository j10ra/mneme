// Server-side dream + heartbeat tests.
//
// Smoke tests that exercise the actual SQL paths against the live DB.
// Each test seeds and tears down its own state under a deterministic
// machine_id / window_key so reruns are clean.

import { describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("dream + heartbeat (requires DATABASE_URL)", () => {
  test("acquireDreamLock: first machine wins, second machine sees the existing claim", async () => {
    const { acquireDreamLock, releaseDreamLock } = await import(
      "../src/routes/dream.ts"
    );
    const windowKey = -999_999_001;
    const machineA = "00000000-0000-0000-0000-00000000a001";
    const machineB = "00000000-0000-0000-0000-00000000a002";

    try {
      const a = await acquireDreamLock(windowKey, machineA);
      expect(a.acquired).toBe(true);

      const b = await acquireDreamLock(windowKey, machineB);
      expect(b.acquired).toBe(false);
      if (!b.acquired) expect(b.heldBy).toBe(machineA);
    } finally {
      await releaseDreamLock(windowKey, machineA, 0);
      const { sql } = await import("../src/infra/db.ts");
      await sql`DELETE FROM _ops.dream_runs WHERE window_key = ${windowKey}`;
    }
  });

  test("releaseDreamLock marks completed_at and stamps cluster_count", async () => {
    const { acquireDreamLock, releaseDreamLock } = await import(
      "../src/routes/dream.ts"
    );
    const { sql } = await import("../src/infra/db.ts");
    const windowKey = -999_999_002;
    const machineA = "00000000-0000-0000-0000-00000000a003";

    try {
      await acquireDreamLock(windowKey, machineA);
      await releaseDreamLock(windowKey, machineA, 7);

      const rows = await sql<
        { completed_at: Date | null; cluster_count: number | null }[]
      >`
        SELECT completed_at, cluster_count
        FROM _ops.dream_runs
        WHERE window_key = ${windowKey}
      `;
      expect(rows[0]?.completed_at).not.toBeNull();
      expect(rows[0]?.cluster_count).toBe(7);
    } finally {
      await sql`DELETE FROM _ops.dream_runs WHERE window_key = ${windowKey}`;
    }
  });

  test("upsertHeartbeat records and overwrites the per-machine row", async () => {
    const { upsertHeartbeat } = await import("../src/routes/heartbeat.ts");
    const { sql } = await import("../src/infra/db.ts");
    const machineId = "00000000-0000-0000-0000-00000000b001";

    try {
      await upsertHeartbeat(machineId, {
        outbox_pending: 3,
        outbox_extracted: 0,
        outbox_embedded: 0,
        outbox_failed: 0,
        last_processed_at: new Date(),
      });
      await upsertHeartbeat(machineId, {
        outbox_pending: 0,
        outbox_extracted: 1,
        outbox_embedded: 0,
        outbox_failed: 0,
        last_processed_at: new Date(),
      });

      const rows = await sql<
        { outbox_pending: number; outbox_extracted: number }[]
      >`
        SELECT outbox_pending, outbox_extracted
        FROM _ops.daemon_heartbeats
        WHERE machine_id = ${machineId}
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.outbox_pending).toBe(0);
      expect(rows[0]?.outbox_extracted).toBe(1);
    } finally {
      await sql`DELETE FROM _ops.daemon_heartbeats WHERE machine_id = ${machineId}`;
    }
  });

  test("validateClustersBody catches missing fields", async () => {
    const { validateClustersBody } = await import("../src/routes/dream.ts");
    expect(validateClustersBody({}).ok).toBe(false);
    expect(
      validateClustersBody({ window_key: 1, clusters: [] }).ok,
    ).toBe(true);
    expect(
      validateClustersBody({
        window_key: 1,
        clusters: [{ member_ids: [], title: "x", summary: "y" }],
      }).ok,
    ).toBe(false); // empty member_ids
  });
});
