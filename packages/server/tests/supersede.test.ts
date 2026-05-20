import { describe, expect, test } from "bun:test";
import { validateSupersedePairs } from "../src/lib/supersede.ts";

const cand = (id: string, iso: string) => ({ id, created_at: iso });

describe("validateSupersedePairs", () => {
  const A = cand("a", "2026-01-01T00:00:00Z"); // oldest
  const B = cand("b", "2026-02-01T00:00:00Z"); // newer

  test("accepts a pair where old_id is strictly older than new_id", () => {
    const r = validateSupersedePairs([{ old_id: "a", new_id: "b", reason: "x" }], [A, B]);
    expect(r.valid).toHaveLength(1);
    expect(r.rejected).toHaveLength(0);
  });

  test("rejects a backwards pair (old_id newer than new_id)", () => {
    const r = validateSupersedePairs([{ old_id: "b", new_id: "a", reason: "x" }], [A, B]);
    expect(r.valid).toHaveLength(0);
    expect(r.rejected[0]?.reason).toBe("old_id is not older than new_id");
  });

  test("rejects equal timestamps — direction undecidable", () => {
    const C = cand("c", "2026-01-01T00:00:00Z");
    const r = validateSupersedePairs([{ old_id: "a", new_id: "c", reason: "x" }], [A, C]);
    expect(r.valid).toHaveLength(0);
    expect(r.rejected[0]?.reason).toBe("old_id is not older than new_id");
  });

  test("rejects a pair referencing an id not in the candidate set", () => {
    const r = validateSupersedePairs([{ old_id: "a", new_id: "ghost", reason: "x" }], [A, B]);
    expect(r.valid).toHaveLength(0);
    expect(r.rejected[0]?.reason).toBe("id not in candidate set");
  });

  test("rejects a pair where old_id equals new_id", () => {
    const r = validateSupersedePairs([{ old_id: "a", new_id: "a", reason: "x" }], [A]);
    expect(r.valid).toHaveLength(0);
    expect(r.rejected[0]?.reason).toBe("old_id equals new_id");
  });

  test("partitions a mixed batch into valid + rejected", () => {
    const r = validateSupersedePairs(
      [
        { old_id: "a", new_id: "b", reason: "good" },
        { old_id: "b", new_id: "a", reason: "backwards" },
        { old_id: "a", new_id: "ghost", reason: "hallucinated" },
      ],
      [A, B],
    );
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0]?.reason).toBe("good");
    expect(r.rejected).toHaveLength(2);
  });

  test("accepts a Date created_at as well as an ISO string", () => {
    const r = validateSupersedePairs(
      [{ old_id: "a", new_id: "b", reason: "x" }],
      [
        { id: "a", created_at: new Date("2026-01-01T00:00:00Z") },
        { id: "b", created_at: new Date("2026-02-01T00:00:00Z") },
      ],
    );
    expect(r.valid).toHaveLength(1);
  });
});
