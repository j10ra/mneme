import { describe, expect, test } from "bun:test";

const {
  rejectUnsubstitutedEmbeds,
  hasRecallMarker,
  extractUuidsFromSql,
  extractRowIds,
  chooseReinforcement,
} = await import("../src/services/mcp.ts");

describe("rejectUnsubstitutedEmbeds — guard for missing daemon substitution", () => {
  test("throws when SQL still contains embed('...')", () => {
    expect(() =>
      rejectUnsubstitutedEmbeds(
        "SELECT * FROM memories WHERE embedding <=> embed('docker compose up') < 0.1",
      ),
    ).toThrow(/daemon/i);
  });

  test("passes through plain SQL unchanged", () => {
    expect(() => rejectUnsubstitutedEmbeds("SELECT 1")).not.toThrow();
  });

  test("passes through SQL where embed() was already substituted to a vector literal", () => {
    expect(() =>
      rejectUnsubstitutedEmbeds(
        "SELECT * FROM memories WHERE embedding <=> '[0.1,0.2,0.3]'::vector < 0.1",
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Reader-pool smoke. Goes through the full handleHttp → runSql path so
// readerSql connection, the LIMIT injection, and the FORBIDDEN_RE gate all
// get exercised against a real DB. Skipped without DATABASE_URL.
// ---------------------------------------------------------------------------

const HAS_DB = Boolean(process.env.DATABASE_URL);

// No afterAll pool teardown — see surface.test.ts for the reason.

describe.skipIf(!HAS_DB)("mneme.sql via readerSql (requires DATABASE_URL)", () => {
  test("benign SELECT executes through the reader pool", async () => {
    const { handleHttp } = await import("../src/services/mcp.ts");
    const resp = (await handleHttp({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "mneme_sql",
        arguments: { query: "SELECT 1 AS one" },
      },
    })) as { result: { content: { text: string }[]; isError: boolean } };
    expect(resp.result.isError).toBe(false);
    const payload = JSON.parse(resp.result.content[0]!.text) as {
      rows: { one: number }[];
      limit: number;
    };
    expect(payload.rows).toEqual([{ one: 1 }]);
    expect(payload.limit).toBe(50);
  });

  test("memories schema check: counts rows without column errors", async () => {
    // Hits the same `memories` columns that surface.ts touches, going via
    // the reader role + RLS path. Catches a separate class of breakage
    // (RLS policy drift, reader role missing SELECT grant on a column)
    // that surface.test.ts doesn't cover because surface uses the writer
    // pool.
    const { handleHttp } = await import("../src/services/mcp.ts");
    const resp = (await handleHttp({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "mneme_sql",
        arguments: {
          query:
            "SELECT id, kind, importance, content, repo, machine_id, created_at, archived_at, meta FROM memories WHERE FALSE",
        },
      },
    })) as { result: { content: { text: string }[]; isError: boolean } };
    expect(resp.result.isError).toBe(false);
  });

  test("INSERT is rejected by the FORBIDDEN_RE gate before hitting the DB", async () => {
    const { handleHttp } = await import("../src/services/mcp.ts");
    const resp = (await handleHttp({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "mneme_sql",
        arguments: { query: "INSERT INTO memories (content) VALUES ('x')" },
      },
    })) as { result: { content: { text: string }[]; isError: boolean } };
    expect(resp.result.isError).toBe(true);
    expect(resp.result.content[0]!.text).toMatch(/forbidden|only SELECT/i);
  });
});

// ---------------------------------------------------------------------------
// Recall LTP helpers (#37). Pure functions — no DB or network. The
// `runSql` write path uses these to decide which rows to reinforce and
// at what strength after every successful read.
// ---------------------------------------------------------------------------

const UUID_A = "11111111-2222-3333-4444-555555555555";
const UUID_B = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const UUID_C = "12345678-90ab-cdef-1234-567890abcdef";

describe("hasRecallMarker", () => {
  test("detects the marker as a leading SQL comment", () => {
    expect(hasRecallMarker("-- mneme:source=recall\nSELECT 1")).toBe(true);
  });
  test("detects the marker with extra whitespace", () => {
    expect(hasRecallMarker("--   mneme:source=recall\nSELECT 1")).toBe(true);
  });
  test("is case-insensitive", () => {
    expect(hasRecallMarker("-- MNEME:SOURCE=RECALL\nSELECT 1")).toBe(true);
  });
  test("returns false on plain SELECT", () => {
    expect(hasRecallMarker("SELECT id FROM memories LIMIT 1")).toBe(false);
  });
  test("does not match a near-miss", () => {
    expect(hasRecallMarker("-- mneme:source=foo")).toBe(false);
  });
});

describe("extractUuidsFromSql", () => {
  test("finds UUID after `id =`", () => {
    expect(extractUuidsFromSql(`SELECT * FROM memories WHERE id = '${UUID_A}'`)).toEqual([UUID_A]);
  });
  test("finds UUIDs inside `id = ANY(ARRAY[...])`", () => {
    const sql = `SELECT * FROM memories WHERE id = ANY(ARRAY['${UUID_A}', '${UUID_B}']::uuid[])`;
    expect(extractUuidsFromSql(sql).sort()).toEqual([UUID_A, UUID_B].sort());
  });
  test("finds UUIDs inside `id IN (...)`", () => {
    const sql = `SELECT * FROM memories WHERE id IN ('${UUID_A}', '${UUID_B}', '${UUID_C}')`;
    expect(extractUuidsFromSql(sql).sort()).toEqual([UUID_A, UUID_B, UUID_C].sort());
  });
  test("is case-insensitive and lowercases output", () => {
    const upper = UUID_A.toUpperCase();
    expect(extractUuidsFromSql(`WHERE id = '${upper}'`)).toEqual([UUID_A]);
  });
  test("deduplicates repeated UUIDs", () => {
    const sql = `WHERE id = '${UUID_A}' OR meta->>'related_to' LIKE '%${UUID_A}%'`;
    expect(extractUuidsFromSql(sql)).toEqual([UUID_A]);
  });
  test("returns [] when no UUIDs are present", () => {
    expect(extractUuidsFromSql("SELECT * FROM memories WHERE kind = 'decision'")).toEqual([]);
  });
});

describe("extractRowIds", () => {
  test("collects valid UUIDs from row.id", () => {
    expect(extractRowIds([{ id: UUID_A }, { id: UUID_B }])).toEqual(
      expect.arrayContaining([UUID_A, UUID_B]),
    );
  });
  test("skips rows missing an id column", () => {
    expect(extractRowIds([{ kind: "decision" }, { id: UUID_A }])).toEqual([UUID_A]);
  });
  test("skips rows whose id is not a UUID (e.g. count(*) returning integer)", () => {
    expect(extractRowIds([{ id: 42 }, { id: "not-a-uuid" }])).toEqual([]);
  });
});

describe("chooseReinforcement", () => {
  const rows3 = [{ id: UUID_A }, { id: UUID_B }, { id: UUID_C }];

  test("/recall marker reinforces result-set ids at full strength", () => {
    const r = chooseReinforcement({
      rawQuery: "-- mneme:source=recall\nSELECT id FROM memories LIMIT 3",
      rewrittenSql: "SELECT id FROM memories LIMIT 3",
      rows: rows3,
      total: 3,
    });
    expect(r).not.toBeNull();
    expect(r!.strength).toBe(1.0);
    expect(r!.ids.sort()).toEqual([UUID_A, UUID_B, UUID_C].sort());
  });

  test("explicit UUID in WHERE reinforces that UUID at full strength", () => {
    const r = chooseReinforcement({
      rawQuery: `SELECT * FROM memories WHERE id = '${UUID_A}'`,
      rewrittenSql: `SELECT * FROM memories WHERE id = '${UUID_A}'`,
      rows: [{ id: UUID_A, content: "x" }],
      total: 1,
    });
    expect(r).not.toBeNull();
    expect(r!.strength).toBe(1.0);
    expect(r!.ids).toEqual([UUID_A]);
  });

  test("anonymous narrow query (rows ≤ cap) reinforces partial strength", () => {
    const r = chooseReinforcement({
      rawQuery: "SELECT id FROM memories WHERE kind = 'decision' LIMIT 5",
      rewrittenSql: "SELECT id FROM memories WHERE kind = 'decision' LIMIT 5",
      rows: rows3,
      total: 3,
    });
    expect(r).not.toBeNull();
    expect(r!.strength).toBe(0.4);
    expect(r!.ids.sort()).toEqual([UUID_A, UUID_B, UUID_C].sort());
  });

  test("anonymous wide query (rows > cap) reinforces nothing", () => {
    const wideRows = Array.from({ length: 30 }, (_, i) => ({
      id: `${i.toString(16).padStart(8, "0")}-0000-0000-0000-000000000000`,
    }));
    const r = chooseReinforcement({
      rawQuery: "SELECT id FROM memories ORDER BY created_at DESC LIMIT 30",
      rewrittenSql: "SELECT id FROM memories ORDER BY created_at DESC LIMIT 30",
      rows: wideRows,
      total: 30,
    });
    expect(r).toBeNull();
  });

  test("zero-row result reinforces nothing", () => {
    const r = chooseReinforcement({
      rawQuery: "SELECT id FROM memories WHERE kind = 'never'",
      rewrittenSql: "SELECT id FROM memories WHERE kind = 'never'",
      rows: [],
      total: 0,
    });
    expect(r).toBeNull();
  });

  test("marker beats partial (full strength even on a 10-row query)", () => {
    const r = chooseReinforcement({
      rawQuery: "-- mneme:source=recall\nSELECT id FROM memories LIMIT 3",
      rewrittenSql: "SELECT id FROM memories LIMIT 3",
      rows: rows3,
      total: 3,
    });
    expect(r!.strength).toBe(1.0);
  });

  test("explicit UUID beats partial when both could apply", () => {
    const r = chooseReinforcement({
      rawQuery: `SELECT * FROM memories WHERE id = '${UUID_A}'`,
      rewrittenSql: `SELECT * FROM memories WHERE id = '${UUID_A}'`,
      rows: [{ id: UUID_A }],
      total: 1,
    });
    expect(r!.strength).toBe(1.0);
    expect(r!.ids).toEqual([UUID_A]);
  });

  test("narrow query without an `id` column in projection reinforces nothing", () => {
    const r = chooseReinforcement({
      rawQuery: "SELECT count(*) FROM memories WHERE kind = 'decision'",
      rewrittenSql: "SELECT count(*) FROM memories WHERE kind = 'decision'",
      rows: [{ count: 7 }],
      total: 1,
    });
    expect(r).toBeNull();
  });

  test("truncated wide query (total > cap, rows < total) reinforces nothing", () => {
    // capResult truncated 30 rows down to 5 due to byte cap. total stays 30 →
    // still a wide scan, no partial reinforcement.
    const r = chooseReinforcement({
      rawQuery: "SELECT id, content FROM memories LIMIT 200",
      rewrittenSql: "SELECT id, content FROM memories LIMIT 200",
      rows: rows3,
      total: 30,
    });
    expect(r).toBeNull();
  });
});

const ZERO_VEC = `[${Array(384).fill(0).join(",")}]`;

describe.skipIf(!HAS_DB)(
  "reinforce propagates atom bumps up to cluster (requires DATABASE_URL)",
  () => {
    const MACHINE = "00000000-0000-0000-0000-00000000ead1";
    const CAPTURE_ID = "00000000-0000-0000-0000-00000000ead1";
    const ids = {
      cluster: "00000000-0000-0000-0000-0000000c1d01",
      atomA: "00000000-0000-0000-0000-0000000a1d01",
      atomB: "00000000-0000-0000-0000-0000000a1d02",
      archivedCluster: "00000000-0000-0000-0000-0000000c1d02",
      atomC: "00000000-0000-0000-0000-0000000a1d03",
    };

    async function seed(): Promise<void> {
      const { sql } = await import("../src/infra/db.ts");
      await sql`
      INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
      VALUES (${CAPTURE_ID}, 'seed', ${`sha-${CAPTURE_ID}`}, 'test', ${MACHINE}, 'testhost', 'test')
    `;
      await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.cluster}::uuid, ${CAPTURE_ID}, 'cluster', 'h-cl', 'h-cl:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'cluster', 0.8, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '5 days')
    `;
      await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at, archived_at)
      VALUES
        (${ids.archivedCluster}::uuid, ${CAPTURE_ID}, 'archived-cluster', 'h-ac', 'h-ac:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'cluster', 0.05, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '90 days', now() - interval '1 hour')
    `;
      await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.atomA}::uuid, ${CAPTURE_ID}, 'atomA', 'h-aa', 'h-aa:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         ${sql.json({ in_cluster: ids.cluster })}, 0, now() - interval '5 days')
    `;
      await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.atomB}::uuid, ${CAPTURE_ID}, 'atomB', 'h-ab', 'h-ab:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '5 days')
    `;
      await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.atomC}::uuid, ${CAPTURE_ID}, 'atomC', 'h-ac2', 'h-ac2:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         ${sql.json({ in_cluster: ids.archivedCluster })}, 0, now() - interval '5 days')
    `;
    }

    async function cleanup(): Promise<void> {
      const { sql } = await import("../src/infra/db.ts");
      await sql`DELETE FROM memories WHERE capture_id = ${CAPTURE_ID}`;
      await sql`DELETE FROM captures WHERE id = ${CAPTURE_ID}`;
    }

    test("bumping atoms propagates to their cluster; unclustered atom and archived-cluster member are isolated", async () => {
      const { sql } = await import("../src/infra/db.ts");
      try {
        await cleanup();
        await seed();
        const { reinforce } = await import("../src/services/mcp.ts");
        await reinforce({ strength: 1, ids: [ids.atomA, ids.atomB, ids.atomC] });

        const rows = await sql<{ id: string; rw: number }[]>`
        SELECT id::text AS id, recall_weight AS rw
        FROM memories
        WHERE id::text = ANY(${Object.values(ids)}::text[])
        ORDER BY id
      `;
        const byId = new Map(rows.map((r) => [r.id, r.rw]));
        expect(byId.get(ids.atomA)).toBeCloseTo(1, 5);
        expect(byId.get(ids.atomB)).toBeCloseTo(1, 5);
        expect(byId.get(ids.atomC)).toBeCloseTo(1, 5);
        // The cluster got bumped ONCE because atomA's in_cluster points at it.
        expect(byId.get(ids.cluster)).toBeCloseTo(1, 5);
        // The archived cluster stays at 0: archived rows are filtered.
        expect(byId.get(ids.archivedCluster)).toBeCloseTo(0, 5);
      } finally {
        await cleanup();
      }
    });

    test("multiple atoms in the same cluster bump the cluster once per query, not once per atom", async () => {
      const { sql } = await import("../src/infra/db.ts");
      try {
        await cleanup();
        await seed();
        // Move atomB into the same cluster as atomA.
        await sql`
        UPDATE memories
        SET meta = meta || ${sql.json({ in_cluster: ids.cluster })}
        WHERE id = ${ids.atomB}::uuid
      `;
        const { reinforce } = await import("../src/services/mcp.ts");
        await reinforce({ strength: 1, ids: [ids.atomA, ids.atomB] });

        const [clusterRow] = await sql<{ rw: number }[]>`
        SELECT recall_weight AS rw FROM memories WHERE id = ${ids.cluster}::uuid
      `;
        // Cluster bumped ONCE (not 2x), because IN-clause dedupes.
        expect(clusterRow?.rw).toBeCloseTo(1, 5);
      } finally {
        await cleanup();
      }
    });
  },
);
