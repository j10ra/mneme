// Server-side dream + heartbeat tests.
//
// Smoke tests that exercise the actual SQL paths against the live DB.
// Each test seeds and tears down its own state under a deterministic
// machine_id / window_key so reruns are clean.

import { describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("dream + heartbeat (requires DATABASE_URL)", () => {
  test("acquireDreamLock: first machine wins, second machine sees the existing claim", async () => {
    const { acquireDreamLock, releaseDreamLock } = await import("../src/routes/dream.ts");
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
    const { acquireDreamLock, releaseDreamLock } = await import("../src/routes/dream.ts");
    const { sql } = await import("../src/infra/db.ts");
    const windowKey = -999_999_002;
    const machineA = "00000000-0000-0000-0000-00000000a003";

    try {
      await acquireDreamLock(windowKey, machineA);
      await releaseDreamLock(windowKey, machineA, 7);

      const rows = await sql<{ completed_at: Date | null; cluster_count: number | null }[]>`
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

      const rows = await sql<{ outbox_pending: number; outbox_extracted: number }[]>`
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
    expect(validateClustersBody({ window_key: 1, clusters: [] }).ok).toBe(true);
    expect(
      validateClustersBody({
        window_key: 1,
        clusters: [{ member_ids: [], title: "x", summary: "y" }],
      }).ok,
    ).toBe(false); // empty member_ids
  });

  test("stampDreamedSeeds writes meta.last_dreamed_at on the given ids", async () => {
    const { stampDreamedSeeds } = await import("../src/routes/dream.ts");
    const { sql } = await import("../src/infra/db.ts");

    const captureId = "00000000-0000-0000-0000-00000000d0ca";
    const idA = "00000000-0000-0000-0000-00000000d0a1";
    const idB = "00000000-0000-0000-0000-00000000d0b2";

    try {
      await sql`
        INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
        VALUES (${captureId}, 'seed', ${`sha-${captureId}`}, 'test',
                '00000000-0000-0000-0000-00000000d001', 'testhost', 'test')
      `;
      for (const id of [idA, idB]) {
        await sql`
          INSERT INTO memories (id, capture_id, chunk_id, content, content_hash,
            embedding_model, kind, machine_id, harness)
          VALUES (${id}, ${captureId}, ${`chunk-${id}`}, ${`c ${id}`}, ${`hash-${id}`},
            'test', 'note', '00000000-0000-0000-0000-00000000d001', 'test')
        `;
      }

      await stampDreamedSeeds([idA, idB]);

      const rows = await sql<{ id: string; stamped: string | null }[]>`
        SELECT id::text AS id, meta->>'last_dreamed_at' AS stamped
        FROM memories WHERE id = ANY(${[idA, idB]})
      `;
      expect(rows).toHaveLength(2);
      for (const r of rows) {
        expect(r.stamped).not.toBeNull();
        expect(Number.isNaN(new Date(r.stamped!).getTime())).toBe(false);
      }
    } finally {
      await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
      await sql`DELETE FROM captures WHERE id = ${captureId}`;
    }
  });

  test("fetchDreamSeedIds returns watermark-ordered eligible ids only", async () => {
    const { fetchDreamSeedIds } = await import("../src/routes/dream.ts");
    const { sql } = await import("../src/infra/db.ts");

    const machineId = "00000000-0000-0000-0000-00000000e001";
    const captureId = "00000000-0000-0000-0000-00000000e0ca";
    const idEligibleA = "00000000-0000-0000-0000-00000000e0a1";
    const idEligibleB = "00000000-0000-0000-0000-00000000e0a2";
    const idClustered = "00000000-0000-0000-0000-00000000e0a3";
    const idArchived = "00000000-0000-0000-0000-00000000e0a4";

    try {
      await sql`
        INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
        VALUES (${captureId}, 'seed', ${`sha-${captureId}`}, 'test',
                ${machineId}, 'testhost', 'test')
      `;
      const insert = async (
        id: string,
        opts: { meta?: Record<string, unknown>; archived?: boolean } = {},
      ): Promise<void> => {
        await sql`
          INSERT INTO memories (
            id, capture_id, chunk_id, content, content_hash,
            embedding, embedding_model, kind, machine_id, harness,
            meta, archived_at
          ) VALUES (
            ${id}, ${captureId}, ${`chunk-${id}`}, ${`c ${id}`}, ${`hash-${id}`},
            ${`[${Array.from({ length: 1024 }, (_, i) => (i === 0 ? 1 : 0)).join(",")}]`}::vector,
            'test', 'note', ${machineId}, 'test',
            ${sql.json((opts.meta ?? {}) as never)}, ${opts.archived ? sql`now()` : null}
          )
        `;
      };
      await insert(idEligibleA);
      await insert(idEligibleB);
      await insert(idClustered, { meta: { in_cluster: "00000000-0000-0000-0000-000000000123" } });
      await insert(idArchived, { archived: true });

      const ids = await fetchDreamSeedIds(machineId);
      expect(ids).toContain(idEligibleA);
      expect(ids).toContain(idEligibleB);
      expect(ids).not.toContain(idClustered);
      expect(ids).not.toContain(idArchived);
    } finally {
      await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
      await sql`DELETE FROM captures WHERE id = ${captureId}`;
    }
  });

  test("writeClusters applies valid supersede pairs, rejects backwards + hallucinated", async () => {
    const { writeClusters } = await import("../src/routes/dream.ts");
    const { sql } = await import("../src/infra/db.ts");

    const machineId = "00000000-0000-0000-0000-00000000c001";
    const captureId = "00000000-0000-0000-0000-00000000c0ca";
    const idA = "00000000-0000-0000-0000-00000000c0a1"; // oldest
    const idB = "00000000-0000-0000-0000-00000000c0b2"; // middle
    const idC = "00000000-0000-0000-0000-00000000c0c3"; // newest
    const ghost = "00000000-0000-0000-0000-00000000c905"; // valid uuid, no row
    const windowKey = -999_999_010;

    try {
      await sql`
        INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
        VALUES (${captureId}, 'seed capture', ${`sha-${captureId}`}, 'test',
                ${machineId}, 'testhost', 'test')
      `;
      const seedMemory = async (id: string, createdAt: string) => {
        await sql`
          INSERT INTO memories (
            id, capture_id, chunk_id, content, content_hash,
            embedding_model, kind, machine_id, harness, created_at
          ) VALUES (
            ${id}, ${captureId}, ${`chunk-${id}`}, ${`content ${id}`}, ${`hash-${id}`},
            'test', 'note', ${machineId}, 'test', ${createdAt}
          )
        `;
      };
      await seedMemory(idA, "2026-01-01T00:00:00Z");
      await seedMemory(idB, "2026-02-01T00:00:00Z");
      await seedMemory(idC, "2026-03-01T00:00:00Z");

      const result = await writeClusters(
        {
          window_key: windowKey,
          clusters: [
            {
              member_ids: [idA, idB, idC],
              title: "test cluster",
              summary: `test summary ${windowKey}`,
              embedding_model: "BAAI/bge-small-en-v1.5",
              supersede_pairs: [
                { old_id: idA, new_id: idC, reason: "good — A older than C" },
                { old_id: idC, new_id: idB, reason: "backwards — C newer than B" },
                { old_id: idA, new_id: ghost, reason: "hallucinated id" },
              ],
            },
          ],
        },
        machineId,
      );

      expect(result.supersedes).toBe(1);
      expect(result.supersedes_rejected).toBe(2);

      const rows = await sql<{ id: string; superseded_by: string | null }[]>`
        SELECT id::text AS id, meta->>'superseded_by' AS superseded_by
        FROM memories WHERE id = ANY(${[idA, idB, idC]})
      `;
      const byId = new Map(rows.map((r) => [r.id, r.superseded_by]));
      expect(byId.get(idA)).toBe(idC); // valid pair applied
      expect(byId.get(idB)).toBeNull(); // backwards pair rejected
      expect(byId.get(idC)).toBeNull(); // hallucinated pair rejected
    } finally {
      const { sql } = await import("../src/infra/db.ts");
      await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
      await sql`DELETE FROM captures WHERE id = ${captureId}`;
      await sql`DELETE FROM _ops.dream_runs WHERE window_key = ${windowKey}`;
    }
  });
});

describe("assembleRepos", () => {
  test("includes neighbor content in seeds and preserves edges", async () => {
    const { assembleRepos } = await import("../src/routes/dream.ts");
    const repos = assembleRepos(
      [
        {
          id: "s1",
          repo: "r",
          neighbor_id: "n1",
          content: "seed one",
          kind: "note",
          created_at: new Date("2026-01-01T00:00:00Z"),
        },
        {
          id: "s2",
          repo: "r",
          neighbor_id: null,
          content: "seed two",
          kind: "note",
          created_at: new Date("2026-01-02T00:00:00Z"),
        },
      ],
      [
        {
          id: "n1",
          repo: "r",
          content: "neighbor one",
          kind: "decision",
          created_at: new Date("2026-01-03T00:00:00Z"),
        },
      ],
    );
    const ids = repos.r!.seeds.map((s) => s.id).sort();
    expect(ids).toEqual(["n1", "s1", "s2"]);
    expect(repos.r!.edges).toContainEqual(["s1", "n1"]);
    const n1 = repos.r!.seeds.find((s) => s.id === "n1")!;
    expect(n1.content).toBe("neighbor one");
  });
});

describe.skipIf(!HAS_DB)("per-batch stamping survives mid-stream failure", () => {
  const MACHINE = "00000000-0000-0000-0000-00000000d501";
  const CAPTURE_ID = "00000000-0000-0000-0000-00000000d501";
  const ZERO_VEC = `[${Array(384).fill(0).join(",")}]`;
  const atomCount = 150; // > DREAM_STREAM_SEED_BATCH (50), so 3 batches.

  async function seed(): Promise<void> {
    const { sql } = await import("../src/infra/db.ts");
    await sql`
      INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
      VALUES (${CAPTURE_ID}, 'seed', ${`sha-${CAPTURE_ID}`}, 'test', ${MACHINE}, 'testhost', 'test')
    `;
    // Batch insert (one round-trip) -- per-row inserts blow the test
    // timeout at 150 rows.
    const rows = Array.from({ length: atomCount }, (_, i) => ({
      id: `00000000-0000-0000-0000-${i.toString(16).padStart(12, "d")}`,
      capture_id: CAPTURE_ID,
      content: `atom-${i}`,
      content_hash: `h-d5-${i}`,
      chunk_id: `h-d5-${i}:bge`,
      embedding_model: "BAAI/bge-small-en-v1.5",
      kind: "discovery",
      importance: 0.5,
      machine_id: MACHINE,
      harness: "test",
    }));
    await sql`
      INSERT INTO memories ${sql(rows, "id", "capture_id", "content", "content_hash", "chunk_id", "embedding_model", "kind", "importance", "machine_id", "harness")}
    `;
    await sql`
      UPDATE memories
      SET embedding = ${ZERO_VEC}::vector,
          meta = '{}'::jsonb,
          recall_weight = 0,
          created_at = now() - interval '5 days'
      WHERE capture_id = ${CAPTURE_ID}
    `;
  }

  async function cleanup(): Promise<void> {
    const { sql } = await import("../src/infra/db.ts");
    await sql`DELETE FROM memories WHERE capture_id = ${CAPTURE_ID}`;
    await sql`DELETE FROM captures WHERE id = ${CAPTURE_ID}`;
  }

  test("stampDreamedSeeds called per-batch advances watermark only for streamed batches", async () => {
    const { sql } = await import("../src/infra/db.ts");
    const { stampDreamedSeeds } = await import("../src/routes/dream.ts");
    try {
      await cleanup();
      await seed();

      // Take our 150 fixture ids in deterministic order; production
      // round-robin via last_dreamed_at NULLS FIRST + created_at ASC will
      // pull them in this same order since they share created_at and are
      // all unstamped.
      const ours: string[] = [];
      for (let i = 0; i < atomCount; i++) {
        ours.push(`00000000-0000-0000-0000-${i.toString(16).padStart(12, "d")}`);
      }

      // Simulate the streaming endpoint: batch 1 + 2 succeed and stamp,
      // batch 3 is "interrupted" — never stamped, mimicking a timeout
      // mid-cycle.
      const BATCH = 50;
      const batch1 = ours.slice(0, BATCH);
      const batch2 = ours.slice(BATCH, BATCH * 2);
      const batch3 = ours.slice(BATCH * 2, BATCH * 3);

      await stampDreamedSeeds(batch1);
      await stampDreamedSeeds(batch2);
      // batch3 NOT stamped.

      const stamped = await sql<{ id: string; ts: string | null }[]>`
        SELECT id::text AS id, meta->>'last_dreamed_at' AS ts
        FROM memories
        WHERE id = ANY(${[...batch1, ...batch2, ...batch3]})
        ORDER BY id
      `;
      const byId = new Map(stamped.map((r) => [r.id, r.ts]));

      for (const id of batch1) expect(byId.get(id)).not.toBeNull();
      for (const id of batch2) expect(byId.get(id)).not.toBeNull();
      for (const id of batch3) expect(byId.get(id)).toBeNull();
    } finally {
      await cleanup();
    }
  });
});
