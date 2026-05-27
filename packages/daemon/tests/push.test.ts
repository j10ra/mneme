// Tests for the bundle-push fetch wrapper.
//
// The point: a server flip mid-flight (Railway "Application not found"
// during redeploy, edge hiccup) must not leave the fetch awaiting
// forever. The AbortController + per-request timeout converts an
// indefinite hang into a transient error the next push tick can retry.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { pushBundleViaServer } from "../src/index.ts";

const bundle = {
  capture: {
    content: "x",
    content_sha256: "abc",
    source: "test",
    hostname: "h",
    harness: "t",
    repo: null,
    machine_id: "m",
    session_id: null,
    agent: null,
    topics: [],
    private: false,
    raw_meta: {},
  },
  memories: [],
};

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("pushBundleViaServer", () => {
  test("rejects with timeout message when fetch hangs past the ceiling", async () => {
    // Mock fetch with a Promise that only resolves on abort, mirroring
    // Bun's real behavior: signal.aborted → fetch rejects with AbortError.
    globalThis.fetch = ((_url: string, init?: RequestInit): Promise<Response> => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    }) as unknown as typeof fetch;

    const push = pushBundleViaServer("https://example", "tok");
    // Use a small fake timer wrapper by relying on setTimeout(0) for test.
    // The default timeout in the wrapper is 30s; we just race long enough
    // to confirm the controller fires AND the wrapper translates it.
    await expect(
      Promise.race([
        push(bundle),
        new Promise((_, r) => setTimeout(() => r(new Error("test-timeout-guard")), 31_000)),
      ]),
    ).rejects.toThrow(/timed out/i);
  }, 35_000);

  test("propagates 4xx as a permanent error", async () => {
    globalThis.fetch = (async () =>
      new Response("bad token", { status: 401 })) as unknown as typeof fetch;
    const push = pushBundleViaServer("https://example", "tok");
    try {
      await push(bundle);
      throw new Error("expected rejection");
    } catch (err) {
      expect((err as Error).message).toMatch(/push failed 401/);
      expect((err as { permanent?: boolean }).permanent).toBe(true);
    }
  });

  test("propagates 5xx as a transient (non-permanent) error", async () => {
    globalThis.fetch = (async () =>
      new Response("oops", { status: 502 })) as unknown as typeof fetch;
    const push = pushBundleViaServer("https://example", "tok");
    try {
      await push(bundle);
      throw new Error("expected rejection");
    } catch (err) {
      expect((err as Error).message).toMatch(/push failed 502/);
      expect((err as { permanent?: boolean }).permanent).toBeUndefined();
    }
  });

  test("resolves cleanly on 200 ok", async () => {
    globalThis.fetch = (async () => new Response("ok", { status: 200 })) as unknown as typeof fetch;
    const push = pushBundleViaServer("https://example", "tok");
    await expect(push(bundle)).resolves.toBeUndefined();
  });
});
