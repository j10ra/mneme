// Tests for the LLM provider picker. Verifies that:
//   1. pickExtract / pickDream return the right instance shape
//   2. Wrapped methods invoke the underlying provider
//   3. Failures re-throw (caller still needs to handle them)
//   4. After threshold failures on a provider, the picker flips —
//      proving the per-provider breaker is fed by the wrapper, not by
//      callers
//   5. findSupersedes is present iff the picked provider trusts the
//      pass (openrouter only; local omits the export entirely)
//
// Provider modules are mocked. env is NOT mocked: bun's mock.module
// persists across test files in the same process, and mocking env
// would clobber DATABASE_URL for the DB-using smokes (workers, surface,
// mcp). Instead, we read process.env directly and skip the breaker-
// flip test if the environment doesn't admit two providers.

import { describe, expect, mock, test } from "bun:test";

const TWO_PROVIDERS_AVAILABLE =
  Boolean(process.env.OPENROUTER_API_KEY) && !process.env.LLM_PROVIDER_FORCE;

const orState = { extract: 0, distill: 0, supersede: 0, fail: false };
mock.module("../src/llm/providers/openrouter.ts", () => ({
  extractObservations: async () => {
    orState.extract++;
    if (orState.fail) throw new Error("openrouter extract failed");
    return [{ content: "obs", kind: "note", importance: 0.5, topics: [] }];
  },
  distillCluster: async () => {
    orState.distill++;
    if (orState.fail) throw new Error("openrouter distill failed");
    return { title: "T", summary: "S" };
  },
  findSupersedes: async () => {
    orState.supersede++;
    return [];
  },
  extractLimits: {
    maxCharsPerCapture: 1,
    maxTotalChars: 1,
    maxSiblings: 1,
    maxOutputTokens: 1,
  },
  dreamLimits: { maxClusterChars: 1, maxOutputTokens: 1, temperature: 0 },
  extractModel: "or-extract",
  dreamModel: "or-dream",
}));

const lcState = { extract: 0, distill: 0 };
mock.module("../src/llm/providers/local.ts", () => ({
  extractObservations: async () => {
    lcState.extract++;
    return [];
  },
  distillCluster: async () => {
    lcState.distill++;
    return { title: "L", summary: "L" };
  },
  // Deliberately omitted: findSupersedes. Local must not be allowed to
  // supersede memories, so it doesn't export the method at all. The
  // picker reflects this in the typed presence on DreamInstance.
  extractLimits: {
    maxCharsPerCapture: 1,
    maxTotalChars: 1,
    maxSiblings: 1,
    maxOutputTokens: 1,
  },
  dreamLimits: { maxClusterChars: 1, maxOutputTokens: 1, temperature: 0 },
  extractModel: "local-extract",
  dreamModel: "local-dream",
}));

const { pickExtract, pickDream } = await import("../src/llm/pick.ts");

describe("pickExtract / pickDream — instance shape", () => {
  test("pickExtract returns ExtractInstance with name, limits, model, extractObservations", () => {
    const ext = pickExtract();
    expect(typeof ext.name).toBe("string");
    expect(ext.limits).toBeDefined();
    expect(typeof ext.model).toBe("string");
    expect(typeof ext.extractObservations).toBe("function");
  });

  test("pickDream returns DreamInstance with name, limits, model, distillCluster", () => {
    const dr = pickDream();
    expect(typeof dr.name).toBe("string");
    expect(dr.limits).toBeDefined();
    expect(typeof dr.model).toBe("string");
    expect(typeof dr.distillCluster).toBe("function");
  });
});

describe("wrapper feeds the per-provider breaker", () => {
  test("on success: provider invoked, instance returns its result", async () => {
    orState.fail = false;
    const ext = pickExtract();
    if (ext.name !== "openrouter") {
      // Forced-local environment; the success path through openrouter
      // mock isn't exercisable. Local is mocked too — assert that path.
      const obs = await ext.extractObservations("hello");
      expect(obs).toEqual([]);
      return;
    }
    const before = orState.extract;
    const obs = await ext.extractObservations("hello");
    expect(orState.extract).toBe(before + 1);
    expect(obs).toHaveLength(1);
  });

  test("on failure: instance re-throws so caller can handle it", async () => {
    const ext = pickExtract();
    if (ext.name !== "openrouter") return; // can't drive a controlled failure
    orState.fail = true;
    await expect(ext.extractObservations("hello")).rejects.toThrow("openrouter extract failed");
    orState.fail = false;
  });
});

// The breaker-flip test depends on having two providers available with
// no force override. Skip otherwise — the test would either trivially
// pass (single-provider env always picks the same one) or be unable to
// observe the flip.
describe.skipIf(!TWO_PROVIDERS_AVAILABLE)(
  "breaker integration: threshold failures flip the picker",
  () => {
    test("threshold failures on openrouter cause subsequent picks to return local", async () => {
      // Reset openrouter breaker by recording a success first. Otherwise
      // failures left over from the previous describe block bleed in.
      orState.fail = false;
      await pickExtract().extractObservations("reset");
      expect(pickExtract().name).toBe("openrouter");

      // Drive 3 failures (PICKER_FAILURE_THRESHOLD). Each is a fresh
      // pickExtract() so we exercise the picker → wrapper → breaker
      // path the same way the worker does.
      orState.fail = true;
      for (let i = 0; i < 3; i++) {
        try {
          await pickExtract().extractObservations("fail");
        } catch {
          // expected
        }
      }

      // Breaker is now open on openrouter — picker must return local.
      const next = pickExtract();
      expect(next.name).toBe("local");
      expect(next.model).toBe("local-extract");

      // Local has no findSupersedes — the trust policy is encoded in the
      // type. pickDream while openrouter is open returns a local
      // instance with the method absent.
      const dr = pickDream();
      expect(dr.name).toBe("local");
      expect(dr.findSupersedes).toBeUndefined();

      orState.fail = false;
    });
  },
);
