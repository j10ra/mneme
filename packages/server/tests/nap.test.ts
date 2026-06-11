// nap helper unit tests. forEachIdBatch is pure (injected deps), so
// these run with no DB. DB-backed describe blocks below test the
// new cluster + member archive phases against a live Postgres.

import { describe, expect, test } from "bun:test";
import { sql } from "../src/infra/db.ts";
import { forEachIdBatch } from "../src/worker/nap.ts";

const HAS_DB = Boolean(process.env.DATABASE_URL);
const ZERO_VEC = `[${Array(384).fill(0).join(",")}]`;

describe("forEachIdBatch", () => {
  test("iterates every batch, advances the cursor, terminates on empty", async () => {
    const batches = [["a", "b"], ["c"]];
    const cursors: string[] = [];
    const applied: string[][] = [];

    const affected = await forEachIdBatch(
      2,
      (cursor) => {
        cursors.push(cursor);

        return Promise.resolve(batches.shift() ?? []);
      },
      (ids) => {
        applied.push(ids);

        return Promise.resolve(ids.length);
      },
    );

    expect(applied).toEqual([["a", "b"], ["c"]]);
    expect(affected).toBe(3);
    expect(cursors).toEqual(["00000000-0000-0000-0000-000000000000", "b", "c"]);
  });

  test("returns 0 and never calls apply when the first fetch is empty", async () => {
    let applyCalls = 0;
    const affected = await forEachIdBatch(
      500,
      () => Promise.resolve([]),
      () => {
        applyCalls++;

        return Promise.resolve(0);
      },
    );

    expect(affected).toBe(0);
    expect(applyCalls).toBe(0);
  });
});

describe.skipIf(!HAS_DB)("napReapStaleDreamLocks (requires DATABASE_URL)", () => {
  const STALE_WINDOW = -987650001;
  const FRESH_WINDOW = -987650002;
  const MACHINE = "00000000-0000-0000-0000-00000000d1ea";

  async function cleanup(): Promise<void> {
    await sql`DELETE FROM _ops.dream_runs WHERE window_key IN (${STALE_WINDOW}, ${FRESH_WINDOW})`;
  }

  test("reaps orphaned (completed_at NULL, old) locks window-agnostically; leaves fresh in-flight claims", async () => {
    try {
      await cleanup();
      // Orphan: claimed > DREAM_STALE_LOCK_AGE_MS (30m) ago, never completed.
      await sql`
        INSERT INTO _ops.dream_runs (window_key, claimed_by_machine_id, claimed_at)
        VALUES (${STALE_WINDOW}, ${MACHINE}, now() - interval '40 minutes')
      `;
      // Fresh: in-flight cycle that must survive the sweep.
      await sql`
        INSERT INTO _ops.dream_runs (window_key, claimed_by_machine_id, claimed_at)
        VALUES (${FRESH_WINDOW}, ${MACHINE}, now())
      `;

      const { napReapStaleDreamLocks } = await import("../src/worker/nap.ts");
      const { reaped, window_keys } = await napReapStaleDreamLocks();

      expect(reaped).toBeGreaterThanOrEqual(1);
      expect(window_keys).toContain(STALE_WINDOW);
      expect(window_keys).not.toContain(FRESH_WINDOW);

      const rows = await sql<{ window_key: number }[]>`
        SELECT window_key FROM _ops.dream_runs
        WHERE window_key IN (${STALE_WINDOW}, ${FRESH_WINDOW})
      `;
      const remaining = rows.map((r) => Number(r.window_key));

      expect(remaining).not.toContain(STALE_WINDOW);
      expect(remaining).toContain(FRESH_WINDOW);
    } finally {
      await cleanup();
    }
  });
});

describe.skipIf(!HAS_DB)("napArchiveDeadClusters (requires DATABASE_URL)", () => {
  const MACHINE = "00000000-0000-0000-0000-0000000eadc1";
  const CAPTURE_ID = "00000000-0000-0000-0000-0000000eadc1";
  const ids = {
    superseded: "00000000-0000-0000-0000-000000c10001",
    dead: "00000000-0000-0000-0000-000000c10002",
    live: "00000000-0000-0000-0000-000000c10003",
    young_dead: "00000000-0000-0000-0000-000000c10004",
    pinned_superseded: "00000000-0000-0000-0000-000000c10005",
  };

  async function seed(): Promise<void> {
    await sql`
      INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
      VALUES (${CAPTURE_ID}, 'seed', ${`sha-${CAPTURE_ID}`}, 'test', ${MACHINE}, 'testhost', 'test')
    `;
    // Cluster A: superseded (eligible regardless of age/recall/importance).
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.superseded}::uuid, ${CAPTURE_ID}, 'A', 'h-c1', 'h-c1:bge', ${ZERO_VEC}::vector,
         'BAAI/bge-small-en-v1.5', 'cluster', 0.8, ${MACHINE}, 'test',
         '{"superseded_by":"00000000-0000-0000-0000-000000c1ffff"}'::jsonb,
         0, now() - interval '5 days')
    `;
    // Cluster B: dead by criteria (rw=0, imp at floor, age > 60d).
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.dead}::uuid, ${CAPTURE_ID}, 'B', 'h-c2', 'h-c2:bge', ${ZERO_VEC}::vector,
         'BAAI/bge-small-en-v1.5', 'cluster', 0.05, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '90 days')
    `;
    // Cluster C: live (importance above threshold).
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.live}::uuid, ${CAPTURE_ID}, 'C', 'h-c3', 'h-c3:bge', ${ZERO_VEC}::vector,
         'BAAI/bge-small-en-v1.5', 'cluster', 0.8, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '90 days')
    `;
    // Cluster D: dead by signals but too young (<= 60d).
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.young_dead}::uuid, ${CAPTURE_ID}, 'D', 'h-c4', 'h-c4:bge', ${ZERO_VEC}::vector,
         'BAAI/bge-small-en-v1.5', 'cluster', 0.05, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '30 days')
    `;
    // Cluster E: superseded AND pinned — pinned guard must override.
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.pinned_superseded}::uuid, ${CAPTURE_ID}, 'E', 'h-c5', 'h-c5:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'cluster', 0.8, ${MACHINE}, 'test',
         '{"superseded_by":"00000000-0000-0000-0000-000000c1ffff","pinned":true}'::jsonb,
         0, now() - interval '90 days')
    `;
  }

  async function cleanup(): Promise<void> {
    await sql`DELETE FROM memories WHERE capture_id = ${CAPTURE_ID}`;
    await sql`DELETE FROM captures WHERE id = ${CAPTURE_ID}`;
  }

  test("archives only superseded + dead-by-signal past min age; pinned and young left alone", async () => {
    try {
      await cleanup();
      await seed();
      const { napArchiveDeadClusters } = await import("../src/worker/nap.ts");
      const count = await napArchiveDeadClusters();

      expect(count).toBe(2);

      const rows = await sql<{ id: string; archived: boolean }[]>`
        SELECT id::text AS id, archived_at IS NOT NULL AS archived
        FROM memories
        WHERE id::text = ANY(${Object.values(ids)}::text[])
        ORDER BY id
      `;
      const byId = new Map(rows.map((r) => [r.id, r.archived]));

      expect(byId.get(ids.superseded)).toBe(true);
      expect(byId.get(ids.dead)).toBe(true);
      expect(byId.get(ids.live)).toBe(false);
      expect(byId.get(ids.young_dead)).toBe(false);
      expect(byId.get(ids.pinned_superseded)).toBe(false);
    } finally {
      await cleanup();
    }
  });
});

describe.skipIf(!HAS_DB)("napArchiveOrphanedMembers (requires DATABASE_URL)", () => {
  const MACHINE = "00000000-0000-0000-0000-0000000eadc2";
  const CAPTURE_ID = "00000000-0000-0000-0000-0000000eadc2";
  const ids = {
    dead_cluster: "00000000-0000-0000-0000-000000c20001",
    live_cluster: "00000000-0000-0000-0000-000000c20002",
    orphan_atom: "00000000-0000-0000-0000-000000a20001",
    live_atom: "00000000-0000-0000-0000-000000a20002",
    unclustered_atom: "00000000-0000-0000-0000-000000a20003",
    pinned_orphan: "00000000-0000-0000-0000-000000a20004",
    non_cluster_target: "00000000-0000-0000-0000-000000a20005",
    wrong_kind_atom: "00000000-0000-0000-0000-000000a20006",
  };

  async function seed(): Promise<void> {
    await sql`
      INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
      VALUES (${CAPTURE_ID}, 'seed', ${`sha-${CAPTURE_ID}`}, 'test', ${MACHINE}, 'testhost', 'test')
    `;
    // Already-archived cluster.
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at, archived_at)
      VALUES
        (${ids.dead_cluster}::uuid, ${CAPTURE_ID}, 'dead-cluster', 'h-dc', 'h-dc:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'cluster', 0.05, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '90 days', now() - interval '1 hour')
    `;
    // Live cluster.
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.live_cluster}::uuid, ${CAPTURE_ID}, 'live-cluster', 'h-lc', 'h-lc:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'cluster', 0.8, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '5 days')
    `;
    // Orphan atom: member of the archived cluster.
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.orphan_atom}::uuid, ${CAPTURE_ID}, 'orphan', 'h-oa', 'h-oa:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         ${sql.json({ in_cluster: ids.dead_cluster })}, 0, now() - interval '5 days')
    `;
    // Live atom: member of the live cluster.
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.live_atom}::uuid, ${CAPTURE_ID}, 'live-atom', 'h-la', 'h-la:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         ${sql.json({ in_cluster: ids.live_cluster })}, 0, now() - interval '5 days')
    `;
    // Unclustered atom: no in_cluster, should never be touched by this phase.
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.unclustered_atom}::uuid, ${CAPTURE_ID}, 'unclustered', 'h-uc', 'h-uc:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '5 days')
    `;
    // Pinned orphan: member of the archived cluster but pinned. The pinned
    // guard must keep it alive even though it's transitively dead.
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.pinned_orphan}::uuid, ${CAPTURE_ID}, 'pinned-orphan', 'h-po', 'h-po:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         ${sql.json({ in_cluster: ids.dead_cluster, pinned: true })},
         0, now() - interval '5 days')
    `;
    // Non-cluster row that's archived: shouldn't be a valid in_cluster
    // target. Production dream only ever writes cluster ids here, but the
    // SQL must be defensive (c.kind = 'cluster' filter).
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at, archived_at)
      VALUES
        (${ids.non_cluster_target}::uuid, ${CAPTURE_ID}, 'non-cluster', 'h-nc', 'h-nc:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '5 days', now() - interval '1 hour')
    `;
    // Atom whose in_cluster points at a non-cluster (bad meta). Must NOT
    // archive — the join filter c.kind = 'cluster' protects against this.
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.wrong_kind_atom}::uuid, ${CAPTURE_ID}, 'wrong-kind', 'h-wk', 'h-wk:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         ${sql.json({ in_cluster: ids.non_cluster_target })}, 0, now() - interval '5 days')
    `;
  }

  async function cleanup(): Promise<void> {
    await sql`DELETE FROM memories WHERE capture_id = ${CAPTURE_ID}`;
    await sql`DELETE FROM captures WHERE id = ${CAPTURE_ID}`;
  }

  test("archives only orphan_atom; pinned, live, unclustered, and wrong-kind-pointer left alone", async () => {
    try {
      await cleanup();
      await seed();
      const { napArchiveOrphanedMembers } = await import("../src/worker/nap.ts");
      const count = await napArchiveOrphanedMembers();

      expect(count).toBe(1);

      const rows = await sql<{ id: string; archived: boolean }[]>`
        SELECT id::text AS id, archived_at IS NOT NULL AS archived
        FROM memories
        WHERE id::text = ANY(${Object.values(ids)}::text[])
        ORDER BY id
      `;
      const byId = new Map(rows.map((r) => [r.id, r.archived]));

      expect(byId.get(ids.orphan_atom)).toBe(true);
      expect(byId.get(ids.live_atom)).toBe(false);
      expect(byId.get(ids.unclustered_atom)).toBe(false);
      expect(byId.get(ids.pinned_orphan)).toBe(false);
      expect(byId.get(ids.wrong_kind_atom)).toBe(false);
    } finally {
      await cleanup();
    }
  });
});
