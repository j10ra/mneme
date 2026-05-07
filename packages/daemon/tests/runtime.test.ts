// Daemon runtime tests.
//
// The runtime exposes two units:
//   - handleCapture: takes a parsed capture body, scrubs strings at the
//     edge, writes to outbox/pending with a deterministic id, returns
//     the id (or an error reason on validation failure).
//   - runWorkerTick: scans pending/, extracts via the agent, transitions
//     to extracted/; scans extracted/, embeds via the in-process model,
//     transitions to embedded/; scans embedded/, pushes the bundle,
//     deletes on success.
//
// Tests inject mock extract / embed / push functions so the cycle is
// deterministic without touching Claude or a server.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createOutbox } from "../src/outbox.ts";
import { createRuntime } from "../src/runtime.ts";
import type { Capture, ExtractedMemory } from "../src/agents/types.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "mneme-runtime-test-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const validBody = {
  content: "Decided to use Postgres advisory locks for dream coordination.",
  source: "claude_code:user_prompt_submit",
  hostname: "macbook-pro",
  repo: "github.com/j10ra/mneme",
  harness: "claude-code",
  agent: "main",
  session_id: "abc123",
  topics: [],
  private: false,
  raw_meta: {},
};

function createMocks(overrides: Partial<{
  extract: (captures: Capture[]) => Promise<ExtractedMemory[]>;
  embed: (texts: string[]) => Promise<number[][]>;
  push: (bundle: unknown) => Promise<void>;
}> = {}) {
  const pushed: unknown[] = [];
  return {
    pushed,
    extract: overrides.extract ??
      (async (captures: Capture[]): Promise<ExtractedMemory[]> =>
        captures.map((c) => ({
          content: `summary of: ${c.content.slice(0, 30)}`,
          kind: "decision",
          importance: 0.7,
          topics: [],
        }))),
    embed: overrides.embed ??
      (async (texts: string[]): Promise<number[][]> =>
        texts.map(() => Array(1024).fill(0.1))),
    push: overrides.push ??
      (async (bundle: unknown): Promise<void> => {
        pushed.push(bundle);
      }),
  };
}

describe("handleCapture", () => {
  test("writes a valid capture into outbox/pending and returns its id", async () => {
    const outbox = createOutbox(root);
    const mocks = createMocks();
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push,
    });

    const result = await runtime.handleCapture(validBody);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ids = await outbox.list("pending");
    expect(ids).toContain(result.id);

    const stored = (await outbox.read(result.id, "pending")) as {
      content: string;
    };
    expect(stored.content).toBe(validBody.content);
  });

  test("rejects a body missing required fields", async () => {
    const outbox = createOutbox(root);
    const mocks = createMocks();
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push,
    });

    const result = await runtime.handleCapture({
      ...validBody,
      content: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/content/);
  });

  test("scrubs string fields at the edge", async () => {
    const outbox = createOutbox(root);
    const mocks = createMocks();
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push,
    });

    const fakeKey =
      "sk-ant-api03-" + "x".repeat(48) + "_AbCdEf"; // matches anthropic_key length
    const result = await runtime.handleCapture({
      ...validBody,
      content: `my token is ${fakeKey}`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stored = (await outbox.read(result.id, "pending")) as {
      content: string;
    };
    expect(stored.content).not.toContain(fakeKey);
    expect(stored.content).toContain("[REDACTED:anthropic_key]");
  });
});

describe("runWorkerTick", () => {
  test("processes a pending capture all the way to a pushed bundle", async () => {
    const outbox = createOutbox(root);
    const mocks = createMocks();
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push,
    });

    const { id } = (await runtime.handleCapture(validBody)) as {
      ok: true;
      id: string;
    };

    await runtime.runWorkerTick();

    expect(await outbox.list("pending")).not.toContain(id);
    expect(await outbox.list("extracted")).not.toContain(id);
    expect(await outbox.list("embedded")).not.toContain(id);
    expect(mocks.pushed).toHaveLength(1);

    const bundle = mocks.pushed[0] as {
      capture: { content: string };
      memories: Array<{ embedding: number[]; chunk_id: string }>;
    };
    expect(bundle.capture.content).toBe(validBody.content);
    expect(bundle.memories).toHaveLength(1);
    expect(bundle.memories[0]!.embedding).toHaveLength(1024);
    expect(bundle.memories[0]!.chunk_id).toMatch(/^[0-9a-f]{64}$/);
  });

  test("leaves the file in pending when extract throws", async () => {
    const outbox = createOutbox(root);
    const mocks = createMocks({
      extract: async () => {
        throw new Error("LLM out");
      },
    });
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push,
    });

    const { id } = (await runtime.handleCapture(validBody)) as {
      ok: true;
      id: string;
    };
    await runtime.runWorkerTick();

    expect(await outbox.list("pending")).toContain(id);
    expect(mocks.pushed).toHaveLength(0);
  });

  test("moves to failed/ when push throws a permanent error", async () => {
    const outbox = createOutbox(root);
    const mocks = createMocks({
      push: async () => {
        throw Object.assign(new Error("400 bad bundle"), { permanent: true });
      },
    });
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push,
    });

    const { id } = (await runtime.handleCapture(validBody)) as {
      ok: true;
      id: string;
    };
    await runtime.runWorkerTick();

    expect(await outbox.list("failed")).toContain(id);
  });

  test("returns cleanly when the outbox is empty", async () => {
    const outbox = createOutbox(root);
    const mocks = createMocks();
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push,
    });

    await runtime.runWorkerTick();
    expect(mocks.pushed).toHaveLength(0);
  });
});
