// Agent registry tests.
//
// The registry is the contract between the daemon's worker loops and
// whichever AgentProvider is configured (Claude in Phase 1; Codex / Gemini
// later via the same interface). Tests cover the shape:
//   - pickAgent("name") returns the registered provider
//   - pickAgent("unknown") errors clearly so config typos surface fast
//   - listAgents() enumerates what's available for the `mneme agent list` CLI

import { describe, expect, test } from "bun:test";
import { listAgents, pickAgent } from "../src/agents/index.ts";

describe("agent registry", () => {
  test("pickAgent returns the named provider", () => {
    const provider = pickAgent("claude");

    expect(provider.name).toBe("claude");
  });

  test("pickAgent throws a clear error on unknown name", () => {
    expect(() => pickAgent("definitely-not-a-real-provider")).toThrow(/unknown agent provider/i);
  });

  test("listAgents enumerates registered provider names", () => {
    const names = listAgents();

    expect(names).toContain("claude");
  });
});
