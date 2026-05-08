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
      push: mocks.push, shasDir: join(root, "shas"),
    });

    const result = await runtime.handleCapture(validBody);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ids = await outbox.list("captured");
    expect(ids).toContain(result.id);

    const stored = (await outbox.read(result.id, "captured")) as {
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
      push: mocks.push, shasDir: join(root, "shas"),
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
      push: mocks.push, shasDir: join(root, "shas"),
    });

    const fakeKey =
      "sk-ant-api03-" + "x".repeat(48) + "_AbCdEf"; // matches anthropic_key length
    const result = await runtime.handleCapture({
      ...validBody,
      content: `my token is ${fakeKey}`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stored = (await outbox.read(result.id, "captured")) as {
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
      push: mocks.push, shasDir: join(root, "shas"),
    });

    const { id } = (await runtime.handleCapture(validBody)) as {
      ok: true;
      id: string;
    };

    await runtime.runWorkerTick();

    expect(await outbox.list("captured")).not.toContain(id);
    expect(await outbox.list("observations")).not.toContain(id);
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
      push: mocks.push, shasDir: join(root, "shas"),
    });

    const { id } = (await runtime.handleCapture(validBody)) as {
      ok: true;
      id: string;
    };
    await runtime.runWorkerTick();

    expect(await outbox.list("captured")).toContain(id);
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
      push: mocks.push, shasDir: join(root, "shas"),
    });

    const { id } = (await runtime.handleCapture(validBody)) as {
      ok: true;
      id: string;
    };
    await runtime.runWorkerTick();

    expect(await outbox.list("failed")).toContain(id);
  });

  test("transient extract errors escalate to failed/ after the retry budget", async () => {
    // Without this budget, the daemon would silently retry the same
    // wedged file forever. Captured/ pile up, no log, no failed/, no
    // surface — exactly the qube-laptop wedge.
    const outbox = createOutbox(root);
    let extractCalls = 0;
    const mocks = createMocks({
      extract: async () => {
        extractCalls++;
        // Every call throws transient (not marked permanent).
        throw new Error("LLM out");
      },
    });
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push,
      shasDir: join(root, "shas"),
      extractMaxRetries: 3, // tighter budget for the test
    });

    const { id } = (await runtime.handleCapture(validBody)) as {
      ok: true;
      id: string;
    };

    // Tick 1: counter 1, file stays in captured/
    await runtime.runWorkerTick();
    expect(await outbox.list("captured")).toContain(id);
    expect(await outbox.list("failed")).toHaveLength(0);

    // Tick 2: counter 2, still under budget
    await runtime.runWorkerTick();
    expect(await outbox.list("captured")).toContain(id);
    expect(await outbox.list("failed")).toHaveLength(0);

    // Tick 3: counter hits maxRetries, file moves to failed/
    await runtime.runWorkerTick();
    expect(await outbox.list("captured")).not.toContain(id);
    expect(await outbox.list("failed")).toContain(id);
    expect(extractCalls).toBe(3);

    // Tick 4: nothing left in captured/ to drive another extract call
    await runtime.runWorkerTick();
    expect(extractCalls).toBe(3);
  });

  test("a successful retry clears the transient counter", async () => {
    // If extract throws once then succeeds on retry, the file should
    // flow through normally and not consume budget on the next failure.
    const outbox = createOutbox(root);
    let extractCalls = 0;
    const mocks = createMocks({
      extract: async (captures) => {
        extractCalls++;
        if (extractCalls === 1) throw new Error("transient flake");
        return captures.map((c) => ({
          content: `summary of: ${c.content.slice(0, 30)}`,
          kind: "decision" as const,
          importance: 0.7,
          topics: [],
        }));
      },
    });
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push,
      shasDir: join(root, "shas"),
      extractMaxRetries: 2,
    });

    const { id } = (await runtime.handleCapture(validBody)) as {
      ok: true;
      id: string;
    };

    // First tick: throws, counter = 1, file stays in captured/.
    await runtime.runWorkerTick();
    expect(await outbox.list("captured")).toContain(id);
    expect(await outbox.list("failed")).toHaveLength(0);

    // Second tick: succeeds, file pushes through, counter cleared.
    await runtime.runWorkerTick();
    expect(await outbox.list("captured")).toHaveLength(0);
    expect(await outbox.list("failed")).toHaveLength(0);
    expect(mocks.pushed).toHaveLength(1);
  });

  test("returns cleanly when the outbox is empty", async () => {
    const outbox = createOutbox(root);
    const mocks = createMocks();
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push, shasDir: join(root, "shas"),
    });

    await runtime.runWorkerTick();
    expect(mocks.pushed).toHaveLength(0);
  });

  test("coalesces same-session captures into one extract call", async () => {
    const outbox = createOutbox(root);
    let extractCalls = 0;
    const mocks = createMocks({
      extract: async (captures) => {
        extractCalls++;
        // Return one observation per call regardless of input size
        return [
          {
            content: `combined: ${captures.length} captures`,
            kind: "summary",
            importance: 0.6,
            topics: [],
          },
        ];
      },
    });
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push, shasDir: join(root, "shas"),
    });

    // Three captures sharing session_id "session-coal" land in the
    // outbox within a few seconds. They should be processed in ONE
    // extract call.
    await runtime.handleCapture({
      ...validBody,
      content: "first prompt of session",
      session_id: "session-coal",
    });
    await runtime.handleCapture({
      ...validBody,
      content: "follow-up question in same session",
      session_id: "session-coal",
    });
    await runtime.handleCapture({
      ...validBody,
      content: "third turn",
      session_id: "session-coal",
    });

    await runtime.runWorkerTick();

    expect(extractCalls).toBe(1);

    // All three captures get pushed (each carries its own provenance
    // row); only the seed bundle has the LLM-derived memories.
    expect(mocks.pushed).toHaveLength(3);
    const memoryCounts = (mocks.pushed as Array<{ memories: unknown[] }>).map(
      (b) => b.memories.length,
    );
    expect(memoryCounts.filter((n) => n > 0)).toHaveLength(1);
    expect(memoryCounts.filter((n) => n === 0)).toHaveLength(2);
  });

  test("gating: defers extract until idle window or batch-full or force-timeout trips", async () => {
    const outbox = createOutbox(root);
    let extractCalls = 0;
    const mocks = createMocks({
      extract: async () => {
        extractCalls++;
        return [];
      },
    });
    let virtualNow = 1_000_000;
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push, shasDir: join(root, "shas"),
      extractBatchFull: 5,
      extractIdleMs: 30_000,
      extractForceMs: 5 * 60_000,
      now: () => virtualNow,
    });

    // One capture lands. Tick immediately (within idle window, under
    // batch-full, oldest is fresh): extract should NOT run yet.
    await runtime.handleCapture(validBody);
    await runtime.runWorkerTick();
    expect(extractCalls).toBe(0);

    // Advance time past the idle window. Tick again: now extract runs
    // because pending/ has been "quiet" since lastPendingWriteAt.
    virtualNow += 31_000;
    await runtime.runWorkerTick();
    expect(extractCalls).toBe(1);
  });

  test("gating: batch-full forces extract before idle window elapses", async () => {
    const outbox = createOutbox(root);
    let extractCalls = 0;
    const mocks = createMocks({
      extract: async () => {
        extractCalls++;
        return [];
      },
    });
    let virtualNow = 2_000_000;
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push, shasDir: join(root, "shas"),
      extractBatchFull: 3,
      extractIdleMs: 30_000,
      extractForceMs: 5 * 60_000,
      now: () => virtualNow,
    });

    // Drop three captures back-to-back, no time advance. Pending count
    // hits batchFull, extract runs even though we're nowhere near the
    // idle window.
    for (let i = 0; i < 3; i++) {
      await runtime.handleCapture({
        ...validBody,
        content: `capture ${i}`,
        session_id: `s-${i}`,
      });
    }
    await runtime.runWorkerTick();
    expect(extractCalls).toBe(3); // three different sessions, three batches
  });

  test("does not coalesce across different session_ids", async () => {
    const outbox = createOutbox(root);
    let extractCalls = 0;
    const mocks = createMocks({
      extract: async () => {
        extractCalls++;
        return [];
      },
    });
    const runtime = createRuntime({
      outbox,
      extract: mocks.extract,
      embed: mocks.embed,
      push: mocks.push, shasDir: join(root, "shas"),
    });

    await runtime.handleCapture({
      ...validBody,
      content: "session A capture",
      session_id: "session-a",
    });
    await runtime.handleCapture({
      ...validBody,
      content: "session B capture",
      session_id: "session-b",
    });

    await runtime.runWorkerTick();

    // Two extract calls because the captures belong to different
    // sessions. Coalescing groups by session_id (and repo, private).
    expect(extractCalls).toBe(2);
  });
});
