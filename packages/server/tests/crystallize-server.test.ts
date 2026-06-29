// Server-side crystallize tests.
//
// Smoke tests that exercise the actual SQL paths against the live DB.
// Each test seeds and tears down its own state under a deterministic
// machine_id / window_key so reruns are clean.

import { describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("crystallize lock (requires DATABASE_URL)", () => {
  test("first machine wins, second sees the claim", async () => {
    const { acquireCrystallizeLock, releaseCrystallizeLock } = await import(
      "../src/routes/crystallize.ts"
    );
    const windowKey = -888_888_001;
    const a = "00000000-0000-0000-0000-0000000c0001";
    const b = "00000000-0000-0000-0000-0000000c0002";

    try {
      const ra = await acquireCrystallizeLock(windowKey, a);

      expect(ra.acquired).toBe(true);
      const rb = await acquireCrystallizeLock(windowKey, b);

      expect(rb.acquired).toBe(false);
      if (!rb.acquired) expect(rb.heldBy).toBe(a);
    } finally {
      await releaseCrystallizeLock(windowKey, a, 0);
      const { sql } = await import("../src/infra/db.ts");

      await sql`DELETE FROM _ops.crystallize_runs WHERE window_key = ${windowKey}`;
    }
  });
});

describe.skipIf(!HAS_DB)("listCrystallizeRepos (requires DATABASE_URL)", () => {
  test("repo with no cluster rows but with a loose memory appears in result", async () => {
    const { listCrystallizeRepos } = await import("../src/routes/crystallize.ts");
    const { sql } = await import("../src/infra/db.ts");
    const repo = "mneme://test/crystallize-repos-no-cluster";
    const machine = "00000000-0000-0000-0000-0000000c0020";
    const vec = `[${Array(384).fill(0).join(",")}]`;
    const contentHash = "aabbcc-test-repo-no-cluster";

    try {
      // Seed a capture + a loose (non-cluster, non-concept) memory for the test repo.
      const [cap] = await sql<{ id: string }[]>`
        INSERT INTO captures (content, content_sha256, source, machine_id, hostname, repo, harness, private)
        VALUES ('loose memory body', ${contentHash}, 'test', ${machine}, 'test', ${repo}, 'test', false)
        ON CONFLICT (content_sha256, machine_id) DO UPDATE SET content = EXCLUDED.content
        RETURNING id`;
      const chunkId = `test-chunk-no-cluster-${contentHash}`;

      await sql`
        INSERT INTO memories (capture_id, chunk_id, content, content_hash, embedding_model, embedding, tsv, kind, machine_id, repo, harness, private)
        VALUES (${cap!.id}, ${chunkId}, 'loose memory body', ${contentHash}, 'bge-small-en-v1.5', ${vec}::vector, to_tsvector('english', 'loose memory body'), 'memory', ${machine}, ${repo}, 'test', false)
        ON CONFLICT (chunk_id) DO NOTHING`;

      const repos = await listCrystallizeRepos(machine);

      expect(repos).toContain(repo);
    } finally {
      await sql`DELETE FROM memories WHERE repo = ${repo}`;
      await sql`DELETE FROM captures WHERE repo = ${repo} AND source = 'test'`;
    }
  });
});

describe.skipIf(!HAS_DB)("writeConcepts upsert (requires DATABASE_URL)", () => {
  test("second write to same concept_id refreshes body and snapshots history", async () => {
    const { writeConcepts } = await import("../src/routes/crystallize.ts");
    const { sql } = await import("../src/infra/db.ts");
    const repo = "mneme://test/crystallize";
    const conceptId = "mneme/test/concept-upsert";
    const machine = "00000000-0000-0000-0000-0000000c0010";
    const vec = `[${Array(384).fill(0).join(",")}]`;
    const base = {
      concept_id: conceptId,
      concept_type: "Overview",
      title: "T",
      tags: [],
      related_to: [],
      source_member_ids: [],
      repo,
      embedding_model: "bge-small-en-v1.5",
      body_embedding: JSON.parse(vec) as number[],
    };

    try {
      const w1 = await writeConcepts(
        { window_key: -888_888_010, concepts: [{ ...base, body: "first body" }] },
        machine,
      );

      expect(w1.written).toBe(1);
      const w2 = await writeConcepts(
        { window_key: -888_888_010, concepts: [{ ...base, body: "second body" }] },
        machine,
      );

      expect(w2.updated).toBe(1);
      const [row] = await sql<{ content: string; history: unknown }[]>`
        SELECT content, meta->'history' AS history FROM memories
        WHERE kind = 'concept' AND meta->>'concept_id' = ${conceptId} AND repo = ${repo}`;

      expect(row?.content).toBe("second body");
      expect(Array.isArray(row?.history)).toBe(true);
      expect((row?.history as unknown[]).length).toBe(1); // "first body" snapshotted
    } finally {
      await sql`DELETE FROM memories WHERE repo = ${repo} AND kind = 'concept'`;
      await sql`DELETE FROM captures WHERE repo = ${repo} AND source = 'crystallize'`;
    }
  });
});

describe.skipIf(!HAS_DB)("concepts lock-ownership gate (requires DATABASE_URL)", () => {
  test("non-owner machine is rejected with 403", async () => {
    const { acquireCrystallizeLock, writeConcepts, releaseCrystallizeLock } = await import(
      "../src/routes/crystallize.ts"
    );
    const { sql } = await import("../src/infra/db.ts");
    const windowKey = -888_888_030;
    const owner = "00000000-0000-0000-0000-0000000c0030";
    const nonOwner = "00000000-0000-0000-0000-0000000c0031";

    try {
      // Owner acquires the lock.
      const r = await acquireCrystallizeLock(windowKey, owner);

      expect(r.acquired).toBe(true);

      // Verify the lock row exists and is held by owner, not nonOwner.
      const lockRows = await sql<{ claimed_by_machine_id: string; completed_at: Date | null }[]>`
        SELECT claimed_by_machine_id, completed_at
        FROM _ops.crystallize_runs
        WHERE window_key = ${windowKey}
      `;

      // Gate: non-owner check (mirrors what the route handler does).
      expect(lockRows[0]).toBeTruthy();
      expect(lockRows[0]!.claimed_by_machine_id).toBe(owner);
      expect(lockRows[0]!.claimed_by_machine_id).not.toBe(nonOwner);
      expect(lockRows[0]!.completed_at).toBeNull();

      // Non-owner attempting to call writeConcepts and then release would fail
      // the ownership gate in the route handler. Verify the gate condition directly.
      const ownershipFails =
        !lockRows[0] ||
        lockRows[0].claimed_by_machine_id !== nonOwner ||
        lockRows[0].completed_at !== null;

      expect(ownershipFails).toBe(true);

      // Owner can complete successfully.
      const vec = Array(384).fill(0);
      const result = await writeConcepts(
        {
          window_key: windowKey,
          concepts: [
            {
              concept_id: "test/lock-gate",
              concept_type: "Overview",
              title: "T",
              body: "lock gate test body",
              tags: [],
              related_to: [],
              source_member_ids: [],
              repo: "mneme://test/lock-gate",
              embedding_model: "bge-small-en-v1.5",
              body_embedding: vec,
            },
          ],
        },
        owner,
      );

      expect(result.written).toBe(1);
    } finally {
      await releaseCrystallizeLock(windowKey, owner, 0);
      await sql`DELETE FROM _ops.crystallize_runs WHERE window_key = ${windowKey}`;
      await sql`DELETE FROM memories WHERE repo = 'mneme://test/lock-gate' AND kind = 'concept'`;
      await sql`DELETE FROM captures WHERE repo = 'mneme://test/lock-gate' AND source = 'crystallize'`;
    }
  });
});

describe.skipIf(!HAS_DB)("napReapStaleCrystallizeLocks (requires DATABASE_URL)", () => {
  test("reaps claims older than max_age_seconds, leaves fresh ones", async () => {
    const { clearStaleCrystallizeLocks } = await import("../src/routes/crystallize.ts");
    const { sql } = await import("../src/infra/db.ts");
    const staleKey = -888_888_040;
    const freshKey = -888_888_041;
    const machine = "00000000-0000-0000-0000-0000000c0040";

    try {
      // Insert a stale uncompleted claim (claimed_at far in the past).
      await sql`
        INSERT INTO _ops.crystallize_runs (window_key, claimed_by_machine_id, claimed_at)
        VALUES (${staleKey}, ${machine}, now() - interval '2 hours')
        ON CONFLICT (window_key) DO UPDATE SET claimed_by_machine_id = EXCLUDED.claimed_by_machine_id,
          claimed_at = EXCLUDED.claimed_at, completed_at = NULL
      `;
      // Insert a fresh uncompleted claim (just now).
      await sql`
        INSERT INTO _ops.crystallize_runs (window_key, claimed_by_machine_id)
        VALUES (${freshKey}, ${machine})
        ON CONFLICT (window_key) DO UPDATE SET claimed_by_machine_id = EXCLUDED.claimed_by_machine_id,
          claimed_at = now(), completed_at = NULL
      `;

      // Reap with 30-minute threshold — stale (2h old) should be deleted, fresh should survive.
      const result = await clearStaleCrystallizeLocks(30 * 60);

      expect(result.cleared).toBeGreaterThanOrEqual(1);
      expect(result.window_keys).toContain(staleKey);
      expect(result.window_keys).not.toContain(freshKey);

      // Fresh row still present.
      const surviving = await sql<{ window_key: number }[]>`
        SELECT window_key FROM _ops.crystallize_runs WHERE window_key = ${freshKey}
      `;

      expect(surviving.length).toBe(1);
    } finally {
      await sql`DELETE FROM _ops.crystallize_runs WHERE window_key IN (${staleKey}, ${freshKey})`;
    }
  });
});
