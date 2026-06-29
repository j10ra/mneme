// parseConceptResponse unit tests.
// No DB, no subprocess — pure JSON parsing and slug verification.

import { describe, expect, test } from "bun:test";

describe("parseConceptResponse", () => {
  test("parses a concepts array and slugifies ids", async () => {
    const { parseConceptResponse } = await import("../src/agents/claude.ts");
    const raw = JSON.stringify({
      concepts: [
        {
          concept_type: "Overview",
          title: "Capture Pipeline",
          body: "Hooks to daemon to server.",
          tags: ["pipeline"],
          related_to: [],
          source_member_ids: ["m1", "m2"],
        },
      ],
    });
    const out = parseConceptResponse(raw, "github.com/j10ra/mneme");

    expect(out).not.toBeNull();
    expect(out?.[0]?.concept_id).toBe("github.com/j10ra/mneme/overview/capture-pipeline");
    expect(out?.[0]?.concept_type).toBe("Overview");
  });

  test("parses concepts from code-fenced JSON", async () => {
    const { parseConceptResponse } = await import("../src/agents/claude.ts");
    const raw =
      '```json\n{"concepts":[{"concept_type":"Subsystem","title":"Capture Hook","body":"Hooks into the shell.","tags":[],"related_to":[],"source_member_ids":[]}]}\n```';
    const out = parseConceptResponse(raw, "example.com/repo");

    expect(out).not.toBeNull();
    expect(out?.[0]?.concept_id).toBe("example.com/repo/subsystem/capture-hook");
  });

  test("returns null on malformed JSON", async () => {
    const { parseConceptResponse } = await import("../src/agents/claude.ts");

    expect(parseConceptResponse("not json", "repo")).toBeNull();
  });
});
