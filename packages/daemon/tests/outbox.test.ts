// Outbox state-machine tests.
//
// The outbox is four directories under ~/.mneme/outbox/. Files move
// between them via atomic POSIX rename, accumulating state at each
// transition (raw capture in pending/, capture+memories in extracted/,
// capture+memories+vectors in embedded/, failed/). These tests use a
// per-test temp directory.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createOutbox } from "../src/outbox.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "mneme-outbox-test-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("outbox", () => {
  test("writeRaw lands a file in pending/", async () => {
    const outbox = createOutbox(root);
    await outbox.writeRaw("abc-001", { content: "hello" });

    const ids = await outbox.list("captured");
    expect(ids).toContain("abc-001");
  });

  test("read returns the parsed file content", async () => {
    const outbox = createOutbox(root);
    await outbox.writeRaw("abc-002", { content: "hello", n: 42 });

    const data = await outbox.read("abc-002", "captured");
    expect(data).toEqual({ content: "hello", n: 42 });
  });

  test("transition moves the file from one state to another", async () => {
    const outbox = createOutbox(root);
    await outbox.writeRaw("abc-003", { content: "x" });

    await outbox.transition("abc-003", "captured", "observations", {
      content: "x",
      memories: [{ content: "x", kind: "note" }],
    });

    expect(await outbox.list("captured")).not.toContain("abc-003");
    expect(await outbox.list("observations")).toContain("abc-003");

    const data = (await outbox.read("abc-003", "observations")) as {
      memories: unknown[];
    };
    expect(data.memories).toHaveLength(1);
  });

  test("delete removes the file from its state", async () => {
    const outbox = createOutbox(root);
    await outbox.writeRaw("abc-004", { content: "x" });
    await outbox.delete("abc-004", "captured");

    expect(await outbox.list("captured")).not.toContain("abc-004");
  });

  test("markFailed moves the file to failed/ and records the reason", async () => {
    const outbox = createOutbox(root);
    await outbox.writeRaw("abc-005", { content: "x" });

    await outbox.markFailed("abc-005", "captured", "extract failed: 5xx loop");

    expect(await outbox.list("captured")).not.toContain("abc-005");
    expect(await outbox.list("failed")).toContain("abc-005");

    const failureFiles = await readdir(join(root, "failed"));
    expect(failureFiles).toContain("abc-005.error.txt");
  });

  test("transition rejects when source file does not exist", async () => {
    const outbox = createOutbox(root);
    await expect(
      outbox.transition("does-not-exist", "captured", "observations", {}),
    ).rejects.toThrow();
  });

  test("list returns an empty array when the state directory is empty", async () => {
    const outbox = createOutbox(root);
    expect(await outbox.list("embedded")).toEqual([]);
  });

  test("temp .tmp files are not surfaced by list", async () => {
    const outbox = createOutbox(root);
    await outbox.writeRaw("abc-006", { content: "x" });
    // The transition writes through a `.<id>.json.tmp` file before
    // renaming. list() must ignore dotfiles / .tmp leftovers so a
    // crash mid-transition never produces phantom queue entries.
    const fs = await import("node:fs/promises");
    await fs.writeFile(join(root, "captured", ".stale.json.tmp"), "{}");

    const ids = await outbox.list("captured");
    expect(ids).toEqual(["abc-006"]);
  });
});
