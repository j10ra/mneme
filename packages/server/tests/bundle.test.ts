// /api/bundle smoke tests.
//
// Gated on DATABASE_URL like surface.test.ts so a fresh clone can run
// `bun test` without provisioning Postgres. The integration path
// (validBundle path) hits the real schema, so a column-name typo in
// routes/bundle.ts fails the suite at `bun test` rather than in
// production logs.

import { describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("/api/bundle smoke (requires DATABASE_URL)", () => {
  test("validateBundleBody catches missing capture", async () => {
    const { validateBundleBody } = await import("../src/routes/bundle.ts");
    const result = validateBundleBody({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/capture/i);
  });

  test("validateBundleBody catches missing memories array", async () => {
    const { validateBundleBody } = await import("../src/routes/bundle.ts");
    const result = validateBundleBody({
      capture: {
        content: "x",
        content_sha256: "a".repeat(64),
        source: "s",
        hostname: "h",
        repo: null,
        harness: "claude-code",
        agent: null,
        session_id: null,
        topics: [],
        private: false,
        raw_meta: {},
      },
    });
    expect(result.ok).toBe(false);
  });

  test("validateBundleBody accepts a fully-formed bundle", async () => {
    const { validateBundleBody } = await import("../src/routes/bundle.ts");
    const result = validateBundleBody({
      capture: {
        content: "decided to use postgres advisory locks",
        content_sha256: "b".repeat(64),
        source: "claude_code:user_prompt_submit",
        hostname: "macbook-pro",
        repo: "github.com/j10ra/mneme",
        harness: "claude-code",
        agent: "main",
        session_id: "abc123",
        topics: [],
        private: false,
        raw_meta: {},
      },
      memories: [
        {
          content: "use advisory locks for dream coordination",
          content_hash: "c".repeat(64),
          chunk_id: "d".repeat(64),
          embedding: Array(1024).fill(0.1),
          embedding_model: "BAAI/bge-large-en-v1.5",
          kind: "decision",
          importance: 0.8,
          topics: [],
          meta: { extractor_provider: "anthropic" },
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  test("end-to-end: insertBundle writes capture + memories, idempotent on retry", async () => {
    const { insertBundle } = await import("../src/routes/bundle.ts");
    const machineId = "00000000-0000-0000-0000-000000bundle1";
    const captureSha = "e1".repeat(32); // 64 chars
    const chunkId = "f1".repeat(32);

    const bundle = {
      capture: {
        content: "bundle smoke test capture",
        content_sha256: captureSha,
        source: "test:bundle",
        hostname: "test-host",
        repo: "mneme://test/bundle-smoke",
        harness: "claude-code",
        agent: "test",
        session_id: null,
        topics: [],
        private: false,
        raw_meta: {},
      },
      memories: [
        {
          content: "smoke memory",
          content_hash: "ab".repeat(32),
          chunk_id: chunkId,
          embedding: Array(1024).fill(0.05),
          embedding_model: "BAAI/bge-large-en-v1.5",
          kind: "note",
          importance: 0.4,
          topics: [],
          meta: { extractor_provider: "test" },
        },
      ],
    };

    const first = await insertBundle(bundle, machineId);
    expect(first.capture_id).toBeDefined();
    expect(first.memory_ids).toHaveLength(1);
    expect(first.deduped[0]).toBe(false);

    const second = await insertBundle(bundle, machineId);
    expect(second.capture_id).toBe(first.capture_id);
    expect(second.deduped[0]).toBe(true);

    // Cleanup
    const { sql } = await import("../src/infra/db.ts");
    await sql`DELETE FROM memories WHERE chunk_id = ${chunkId}`;
    await sql`DELETE FROM captures WHERE content_sha256 = ${captureSha} AND machine_id = ${machineId}`;
  });
});
