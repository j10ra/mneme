import { describe, expect, mock, test } from "bun:test";

// Mock the embedder before importing the SUT. substituteEmbeds calls
// embedBatch synchronously inside the module — capture every call so we
// can assert what reached the embedder.
//
// IMPORTANT: bun's mock.module persists across test files in the same
// process. The mock MUST re-export every name the real module exports,
// otherwise other test files (workers.test.ts, etc.) that import from
// embedder via extract.ts crash with "Export named X not found".
const calls: string[][] = [];
mock.module("../src/embedder/index.ts", () => ({
  embedBatch: async (texts: string[]) => {
    calls.push(texts);
    return texts.map(() => Array.from({ length: 4 }, () => 0));
  },
  embedText: async (_t: string) => Array.from({ length: 4 }, () => 0),
  EMBEDDER_MODEL: "mock-embedder",
  EMBEDDER_DIM: 4,
}));

const { substituteEmbeds } = await import("../src/services/mcp.ts");

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
    };
    expect(payload.rows).toEqual([{ one: 1 }]);
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
