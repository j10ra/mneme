import { describe, expect, mock, test } from "bun:test";
import { EMBEDDER_DIM } from "../src/embedder/local.ts";

// Mock the embedder before importing the SUT. substituteEmbeds calls
// embedBatch synchronously inside the module — capture every call so we
// can assert what reached the embedder.
//
// IMPORTANT: bun's mock.module persists across test files in the same
// process. The mock MUST re-export every name the real module exports
// (or files importing via extract.ts crash with "Export named X not
// found"), AND with faithful values. bundle.test.ts imports EMBEDDER_DIM
// from this module and sizes real vector(384) DB inserts by it, so a
// fabricated dimension leaks process-wide and breaks those inserts.
// EMBEDDER_DIM is taken from the un-mocked local.ts so it tracks the
// real schema; the mock vectors are sized to match.
const calls: string[][] = [];
mock.module("../src/embedder/index.ts", () => ({
  embedBatch: async (texts: string[]) => {
    calls.push(texts);
    return texts.map(() => Array.from({ length: EMBEDDER_DIM }, () => 0));
  },
  embedText: async (_t: string) => Array.from({ length: EMBEDDER_DIM }, () => 0),
  EMBEDDER_MODEL: "mock-embedder",
  EMBEDDER_DIM,
}));

const {
  substituteEmbeds,
  hasRecallMarker,
  extractUuidsFromSql,
  extractRowIds,
  chooseReinforcement,
} = await import("../src/services/mcp.ts");

describe("substituteEmbeds — secrets scrubbed before embedding", () => {
  test("redacts a JWT in embed()", async () => {
    calls.length = 0;
    await substituteEmbeds(
      "SELECT * FROM memories WHERE embedding <=> embed('Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.signaturepartXXXXXXXXX') < 0.1",
    );
    expect(calls).toHaveLength(1);
    const sentToEmbedder = calls[0]!.join(" ");
    expect(sentToEmbedder).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(sentToEmbedder).toContain("[REDACTED:jwt]");
  });

  test("redacts an anthropic key in embed()", async () => {
    calls.length = 0;
    await substituteEmbeds(
      "SELECT 1 FROM memories WHERE embedding <=> embed('see sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCd here') < 0.1",
    );
    expect(calls).toHaveLength(1);
    const sentToEmbedder = calls[0]!.join(" ");
    expect(sentToEmbedder).not.toContain("sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCd");
    expect(sentToEmbedder).toContain("[REDACTED:anthropic_key]");
  });

  test("benign text passes through unchanged", async () => {
    calls.length = 0;
    await substituteEmbeds(
      "SELECT 1 FROM memories WHERE embedding <=> embed('docker compose up') < 0.1",
    );
    expect(calls[0]).toEqual(["docker compose up"]);
  });

  test("no embed() macro = no embedder call", async () => {
    calls.length = 0;
    const out = await substituteEmbeds("SELECT 1");
    expect(out).toBe("SELECT 1");
    expect(calls).toHaveLength(0);
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
