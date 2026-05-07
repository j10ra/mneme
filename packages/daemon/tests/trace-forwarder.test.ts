// TraceForwarder bucketing + flush semantics. The daemon's tracing
// must not lose child spans for in-flight traces — a span pushed
// before pushTrace lives in the pending bucket until the trace
// finalizes, then both ride into the same POST.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { TraceForwarder } from "../src/trace-forwarder.ts";

type Captured = {
  url: string;
  body: { traces: unknown[]; spans: unknown[]; logs: unknown[] };
};

function makeFakeFetch() {
  const calls: Captured[] = [];
  const fakeFetch = (async (url: string, init?: { body?: string }) => {
    calls.push({
      url,
      body: JSON.parse(init?.body ?? "{}"),
    });
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  return { calls, fakeFetch };
}

describe("TraceForwarder", () => {
  let originalRoot: string | undefined;

  beforeEach(() => {
    originalRoot = process.env.MNEME_ROOT;
  });

  afterEach(() => {
    process.env.MNEME_ROOT = originalRoot;
  });

  test("flush sends nothing when buffers empty", async () => {
    const { calls, fakeFetch } = makeFakeFetch();
    const fwd = new TraceForwarder({
      serverUrl: "http://localhost:9999",
      token: "test-token",
      fetch: fakeFetch,
    });
    await fwd.flush();
    expect(calls).toHaveLength(0);
  });

  test("pushSpan before pushTrace buffers until finalize", async () => {
    const { calls, fakeFetch } = makeFakeFetch();
    const fwd = new TraceForwarder({
      serverUrl: "http://localhost:9999",
      token: "test-token",
      fetch: fakeFetch,
    });
    fwd.pushSpan({
      traceId: "t1",
      spanId: "s1-child",
      name: "child",
      startedAtMs: 1,
      durationMs: 10,
    });
    // Spans alone shouldn't flush (waiting for pushTrace).
    await fwd.flush();
    expect(calls).toHaveLength(0);

    fwd.pushTrace({
      traceId: "t1",
      rootSpanName: "root",
      source: "daemon",
      startedAtMs: 0,
      endedAtMs: 11,
      durationMs: 11,
    });
    await fwd.flush();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body.traces).toHaveLength(1);
    expect(calls[0]!.body.spans).toHaveLength(1);
  });

  test("pushSpan for already-finalized trace bypasses pending bucket", async () => {
    const { calls, fakeFetch } = makeFakeFetch();
    const fwd = new TraceForwarder({
      serverUrl: "http://localhost:9999",
      token: "test-token",
      fetch: fakeFetch,
    });
    fwd.pushTrace({
      traceId: "t-late",
      rootSpanName: "root",
      source: "daemon",
      startedAtMs: 0,
      endedAtMs: 5,
      durationMs: 5,
    });
    // Span arriving AFTER its trace was finalized — escaping async task.
    fwd.pushSpan({
      traceId: "t-late",
      spanId: "late-1",
      name: "late",
      startedAtMs: 6,
      durationMs: 1,
    });
    await fwd.flush();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body.spans).toHaveLength(1);
  });

  test("flush survives server 500", async () => {
    const fakeFetch = (async () =>
      new Response("oops", { status: 500 })) as unknown as typeof fetch;
    const fwd = new TraceForwarder({
      serverUrl: "http://localhost:9999",
      token: "test-token",
      fetch: fakeFetch,
    });
    fwd.pushTrace({
      traceId: "t-err",
      rootSpanName: "root",
      source: "daemon",
      startedAtMs: 0,
      endedAtMs: 1,
      durationMs: 1,
    });
    // Drops batch on rejection — must not throw to caller.
    await fwd.flush();
  });

  test("flush survives network failure", async () => {
    const fakeFetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const fwd = new TraceForwarder({
      serverUrl: "http://localhost:9999",
      token: "test-token",
      fetch: fakeFetch,
    });
    fwd.pushTrace({
      traceId: "t-net",
      rootSpanName: "root",
      source: "daemon",
      startedAtMs: 0,
      endedAtMs: 1,
      durationMs: 1,
    });
    await fwd.flush();
  });

  test("untraced log flushes immediately (no FK to wait for)", async () => {
    const { calls, fakeFetch } = makeFakeFetch();
    const fwd = new TraceForwarder({
      serverUrl: "http://localhost:9999",
      token: "test-token",
      fetch: fakeFetch,
    });
    fwd.pushLog({
      level: "info",
      message: "hello",
      ts: Date.now(),
    });
    await fwd.flush();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body.logs).toHaveLength(1);
    expect(calls[0]!.body.traces).toHaveLength(0);
  });
});
