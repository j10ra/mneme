// In-process embedder tests.
//
// The unit tests here cover the wrapper logic (empty input, dimension
// constant, model name constant). The "live" test that actually loads
// the BAAI/bge-large-en-v1.5 ONNX model is gated behind MNEME_RUN_LIVE=1
// because the first run downloads ~1.3GB and warms up an ONNX runtime —
// not appropriate for the default test loop.

import { describe, expect, test } from "bun:test";
import { EMBEDDER_DIM, EMBEDDER_MODEL, embedBatch } from "../src/embed.ts";

const RUN_LIVE = process.env.MNEME_RUN_LIVE === "1";

describe("embed", () => {
  test("EMBEDDER_MODEL matches the schema's expected model name", () => {
    expect(EMBEDDER_MODEL).toBe("BAAI/bge-large-en-v1.5");
  });

  test("EMBEDDER_DIM is 1024 (matches pgvector column)", () => {
    expect(EMBEDDER_DIM).toBe(1024);
  });

  test("embedBatch returns an empty array for empty input", async () => {
    const result = await embedBatch([]);
    expect(result).toEqual([]);
  });

  test.skipIf(!RUN_LIVE)(
    "embedBatch returns 1024-dim normalized vectors for real text",
    async () => {
      const result = await embedBatch(["hello world", "the quick brown fox"]);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(EMBEDDER_DIM);
      expect(result[1]).toHaveLength(EMBEDDER_DIM);

      // L2-normalized vectors have magnitude 1.
      const magnitude = Math.sqrt(result[0]!.reduce((s, x) => s + x * x, 0));
      expect(magnitude).toBeCloseTo(1.0, 2);
    },
    120_000,
  );
});
