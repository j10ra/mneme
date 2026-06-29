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
