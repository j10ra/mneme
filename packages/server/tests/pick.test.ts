// Tests for the LLM provider picker. Surface shrank dramatically in
// 1.1.63 — server is single-provider (openrouter), so the picker is now
// mostly a wrapper that hides the judgments when the breaker is open or
// OPENROUTER_API_KEY is missing.

import { describe, expect, mock, test } from "bun:test";

const orState = { supersede: 0, merge: 0, fail: false };
mock.module("../src/llm/providers/openrouter.ts", () => ({
  findSupersedes: async () => {
    orState.supersede++;
    if (orState.fail) throw new Error("openrouter supersede failed");
    return [];
  },
  judgeClusterMerge: async () => {
    orState.merge++;
    if (orState.fail) throw new Error("openrouter merge failed");
    return { same_topic: false, reason: "stub" };
  },
  dreamLimits: { maxClusterChars: 1, maxOutputTokens: 1, temperature: 0 },
  dreamModel: "or-dream",
}));

const HAS_OR = Boolean(process.env.OPENROUTER_API_KEY);

const { pickDream, inspectBreakers } = await import("../src/llm/pick.ts");

describe("pickDream — instance shape", () => {
  test("returns DreamInstance with name, limits, model", () => {
    const dr = pickDream();
    expect(dr.name).toBe("openrouter");
    expect(dr.limits).toBeDefined();
    expect(dr.model).toBe("or-dream");
  });

  test.skipIf(!HAS_OR)("findSupersedes + judgeClusterMerge present when key is set", () => {
    const dr = pickDream();
    expect(typeof dr.findSupersedes).toBe("function");
    expect(typeof dr.judgeClusterMerge).toBe("function");
  });

  test.skipIf(HAS_OR)("findSupersedes + judgeClusterMerge hidden when key is missing", () => {
    const dr = pickDream();
    expect(dr.findSupersedes).toBeUndefined();
    expect(dr.judgeClusterMerge).toBeUndefined();
  });
});

describe("inspectBreakers — single-provider shape", () => {
  test("returns a single 'openrouter' breaker state", () => {
    const b = inspectBreakers();
    expect(Object.keys(b)).toEqual(["openrouter"]);
    expect(b.openrouter).toBeDefined();
  });
});

describe.skipIf(!HAS_OR)("wrapper feeds the breaker on failure", () => {
  test("provider re-throws and the call counts a failure", async () => {
    orState.fail = false;
    // Establish a baseline success first so this test doesn't inherit
    // failures from an earlier run in the same process.
    await pickDream().findSupersedes?.([]);
    orState.fail = true;
    const dr = pickDream();
    await expect(dr.findSupersedes?.([])).rejects.toThrow(/openrouter supersede failed/);
    orState.fail = false;
  });
});
