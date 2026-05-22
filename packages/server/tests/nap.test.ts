// nap helper unit tests. forEachIdBatch is pure (injected deps), so
// these run with no DB.

import { describe, expect, test } from "bun:test";
import { forEachIdBatch } from "../src/worker/nap.ts";

describe("forEachIdBatch", () => {
  test("iterates every batch, advances the cursor, terminates on empty", async () => {
    const batches = [["a", "b"], ["c"]];
    const cursors: string[] = [];
    const applied: string[][] = [];

    const affected = await forEachIdBatch(
      2,
      (cursor) => {
        cursors.push(cursor);
        return Promise.resolve(batches.shift() ?? []);
      },
      (ids) => {
        applied.push(ids);
        return Promise.resolve(ids.length);
      },
    );

    expect(applied).toEqual([["a", "b"], ["c"]]);
    expect(affected).toBe(3);
    expect(cursors).toEqual(["00000000-0000-0000-0000-000000000000", "b", "c"]);
  });

  test("returns 0 and never calls apply when the first fetch is empty", async () => {
    let applyCalls = 0;
    const affected = await forEachIdBatch(
      500,
      () => Promise.resolve([]),
      () => {
        applyCalls++;
        return Promise.resolve(0);
      },
    );
    expect(affected).toBe(0);
    expect(applyCalls).toBe(0);
  });
});
