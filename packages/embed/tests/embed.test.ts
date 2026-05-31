// Validates the canonical embedder produces the corpus's vector shape.
// Loads the real model (cached locally / baked in CI), so it's gated by
// MNEME_RUN_EMBED_TESTS=1 to keep the default suite offline + fast.

import { describe, expect, test } from "bun:test";
import { EMBEDDER_DIM, embed } from "../src/index.ts";

const RUN = process.env.MNEME_RUN_EMBED_TESTS === "1";

describe.skipIf(!RUN)("@mneme/embed (set MNEME_RUN_EMBED_TESTS=1)", () => {
  test("produces unit-normalized 384-dim vectors, one per text", async () => {
    const vecs = await embed(["docker compose", "oauth token rotation"]);

    expect(vecs.length).toBe(2);

    for (const v of vecs) {
      expect(v.length).toBe(EMBEDDER_DIM);
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));

      expect(Math.abs(norm - 1)).toBeLessThan(1e-3);
    }

    // Distinct inputs → distinct vectors.
    expect(vecs[0]).not.toEqual(vecs[1]);
  }, 60_000);

  test("empty input short-circuits without loading the model", async () => {
    expect(await embed([])).toEqual([]);
  });
});
