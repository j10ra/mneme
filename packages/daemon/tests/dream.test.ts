// Daemon dream cycle tests.
//
// The cycle has three pure helpers (window-key derivation, cron offset
// derivation, union-find component building) and one orchestrator
// (runDreamCycle) that talks to the server via dependency-injected fetch.
// Tests inject mocks; nothing here hits Claude or the server.

import { describe, expect, test } from "bun:test";
import {
  buildComponents,
  computeCronOffsetMinutes,
  computeWindowKey,
  runDreamCycle,
} from "../src/dream.ts";
import type { Memory } from "../src/agents/types.ts";

describe("computeWindowKey", () => {
  test("returns floor(epoch_seconds / 28800) for an 8h window", () => {
    const date = new Date("2026-05-07T00:00:00Z");
    const expected = Math.floor(date.getTime() / 1000 / (8 * 3600));
    expect(computeWindowKey(date)).toBe(expected);
  });

  test("two timestamps inside the same 8h window yield the same key", () => {
    const a = new Date("2026-05-07T01:00:00Z");
    const b = new Date("2026-05-07T07:59:59Z");
    expect(computeWindowKey(a)).toBe(computeWindowKey(b));
  });
});

describe("computeCronOffsetMinutes", () => {
  test("is deterministic for the same machine_id", () => {
    const a = computeCronOffsetMinutes("00000000-0000-0000-0000-000000000001");
    const b = computeCronOffsetMinutes("00000000-0000-0000-0000-000000000001");
    expect(a).toBe(b);
  });

  test("falls in [0, 480) (the 8h window in minutes)", () => {
    for (let i = 0; i < 5; i++) {
      const offset = computeCronOffsetMinutes(crypto.randomUUID());
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(480);
    }
  });
});

describe("buildComponents", () => {
  test("returns each disconnected seed as its own singleton", () => {
    const components = buildComponents(["a", "b", "c"], []);
    expect(components).toHaveLength(3);
  });

  test("groups connected seeds via union-find", () => {
    const components = buildComponents(
      ["a", "b", "c", "d"],
      [
        ["a", "b"],
        ["b", "c"],
      ],
    );
    expect(components).toHaveLength(2);
    const sorted = components.map((c) => c.slice().sort()).sort();
    expect(sorted).toContainEqual(["a", "b", "c"]);
    expect(sorted).toContainEqual(["d"]);
  });
});

describe("runDreamCycle", () => {
  function fakeFetch(handlers: Record<string, (req: RequestInit) => Response | Promise<Response>>) {
    return async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      const handler = handlers[path];
      if (!handler) {
        return new Response(`no handler for ${path}`, { status: 404 });
      }
      return await handler(init);
    };
  }

  test("skips cleanly when /api/dream/lock returns 409", async () => {
    const calls: string[] = [];
    const result = await runDreamCycle({
      serverUrl: "https://srv.test",
      token: "fake",
      machineId: "00000000-0000-0000-0000-000000000001",
      fetch: fakeFetch({
        "/api/dream/lock": () => {
          calls.push("lock");
          return new Response(JSON.stringify({ acquired: false, heldBy: "other" }), {
            status: 409,
          });
        },
      }),
      distill: async () => ({ title: "x", summary: "y" }),
    });
    expect(result.skipped).toBe(true);
    expect(calls).toEqual(["lock"]);
  });

  test("posts clusters for components in [3,20] when lock acquired", async () => {
    const calls: string[] = [];
    let postedClusters: unknown = null;

    const candidatesPayload = {
      window_key: 12345,
      repos: {
        "github.com/test/repo": {
          seeds: [
            { id: "a", content: "obs a", kind: "decision", created_at: "2026-05-01" },
            { id: "b", content: "obs b", kind: "decision", created_at: "2026-05-01" },
            { id: "c", content: "obs c", kind: "decision", created_at: "2026-05-01" },
            { id: "d", content: "obs d", kind: "note", created_at: "2026-05-01" },
          ],
          edges: [
            ["a", "b"],
            ["b", "c"],
          ],
        },
      },
    };

    const result = await runDreamCycle({
      serverUrl: "https://srv.test",
      token: "fake",
      machineId: "00000000-0000-0000-0000-000000000001",
      windowKey: 12345,
      fetch: fakeFetch({
        "/api/dream/lock": () => {
          calls.push("lock");
          return new Response(JSON.stringify({ acquired: true, window_key: 12345 }), {
            status: 200,
          });
        },
        "/api/dream/candidates": () => {
          calls.push("candidates");
          return new Response(JSON.stringify(candidatesPayload), { status: 200 });
        },
        "/api/dream/clusters": async (req) => {
          calls.push("clusters");
          postedClusters = JSON.parse(req.body as string);
          return new Response(JSON.stringify({ written: 1, supersedes: 0 }), {
            status: 200,
          });
        },
      }),
      distill: async (members: Memory[]) => ({
        title: `cluster of ${members.length}`,
        summary: "the underlying topic",
      }),
    });

    expect(result.skipped).toBe(false);
    expect(calls).toEqual(["lock", "candidates", "clusters"]);
    const posted = postedClusters as {
      window_key: number;
      clusters: Array<{ member_ids: string[]; title: string; summary: string }>;
    };
    expect(posted.window_key).toBe(12345);
    expect(posted.clusters).toHaveLength(1);
    expect(posted.clusters[0]!.member_ids.sort()).toEqual(["a", "b", "c"]);
    expect(posted.clusters[0]!.title).toContain("cluster of 3");
  });

  test("submits an empty clusters list when no components qualify", async () => {
    let postedClusters: unknown = null;
    const result = await runDreamCycle({
      serverUrl: "https://srv.test",
      token: "fake",
      machineId: "00000000-0000-0000-0000-000000000001",
      windowKey: 1,
      fetch: fakeFetch({
        "/api/dream/lock": () =>
          new Response(JSON.stringify({ acquired: true, window_key: 1 }), {
            status: 200,
          }),
        "/api/dream/candidates": () =>
          new Response(
            JSON.stringify({
              window_key: 1,
              repos: {
                r: {
                  seeds: [{ id: "a", content: "x", kind: "note", created_at: "2026" }],
                  edges: [],
                },
              },
            }),
            { status: 200 },
          ),
        "/api/dream/clusters": async (req) => {
          postedClusters = JSON.parse(req.body as string);
          return new Response(JSON.stringify({ written: 0, supersedes: 0 }), {
            status: 200,
          });
        },
      }),
      distill: async () => ({ title: "x", summary: "y" }),
    });
    expect(result.skipped).toBe(false);
    expect((postedClusters as { clusters: unknown[] }).clusters).toEqual([]);
  });
});
