// Embedder tests.
//
// The default suite covers the wrapper logic (empty input, constants).
// The live test that actually spawns the subprocess and loads the
// bge-small ONNX model is gated behind MNEME_RUN_LIVE=1 because the
// first run downloads ~33MB and warms up an ONNX runtime — not
// appropriate for the default test loop.

import { afterAll, describe, expect, test } from "bun:test";
import { disposeIfIdle, embedBatch, EMBEDDER_DIM, EMBEDDER_MODEL } from "../src/embed.ts";

const RUN_LIVE = process.env.MNEME_RUN_LIVE === "1";

describe("embed", () => {
  test("EMBEDDER_MODEL matches the schema's expected model name", () => {
    expect(EMBEDDER_MODEL).toBe("BAAI/bge-small-en-v1.5");
  });

  test("EMBEDDER_DIM is 384 (matches pgvector column)", () => {
    expect(EMBEDDER_DIM).toBe(384);
  });

  test("embedBatch returns an empty array for empty input", async () => {
    // Empty input must short-circuit before spawning the worker so
    // callers can cheaply ask for an empty batch.
    const result = await embedBatch([]);
    expect(result).toEqual([]);
  });

  test.skipIf(!RUN_LIVE)(
    "embedBatch returns 384-dim normalized vectors via subprocess",
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

  test.skipIf(!RUN_LIVE)(
    "disposeIfIdle kills the worker and the next call re-spawns",
    async () => {
      // Warm the worker, then force-dispose with idleMs=0.
      await embedBatch(["warmup"]);
      const disposed = await disposeIfIdle(0);
      expect(disposed).toBe(true);

      // Second call must succeed (re-spawn path).
      const result = await embedBatch(["after dispose"]);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(EMBEDDER_DIM);
    },
    180_000,
  );

  // Ensure we don't leave an orphaned worker behind between test files.
  afterAll(async () => {
    if (RUN_LIVE) await disposeIfIdle(0);
  });
});
