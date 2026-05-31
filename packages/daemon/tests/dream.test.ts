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
  parseNdjsonCandidates,
  runDreamCycle,
} from "../src/dream.ts";
import type { Memory } from "../src/agents/types.ts";

function ndjsonResponse(lines: object[]): Response {
  const body = lines.map((l) => `${JSON.stringify(l)}\n`).join("");

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

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

describe("parseNdjsonCandidates", () => {
  test("assembles repos from a clean stream", async () => {
    const response = ndjsonResponse([
      { t: "meta", window_key: 7 },
      {
        t: "edge",
        id: "s1",
        repo: "r",
        content: "seed one",
        kind: "note",
        created_at: "2026-01-01T00:00:00Z",
        neighbor_id: "n1",
      },
      {
        t: "edge",
        id: "s2",
        repo: "r",
        content: "seed two",
        kind: "note",
        created_at: "2026-01-02T00:00:00Z",
        neighbor_id: null,
      },
      {
        t: "neighbor",
        id: "n1",
        repo: "r",
        content: "neighbor one",
        kind: "decision",
        created_at: "2026-01-03T00:00:00Z",
      },
      { t: "done", seeds: 2, neighbors: 1 },
    ]);
    const result = await parseNdjsonCandidates(response, 7);

    expect(result.window_key).toBe(7);
    const ids = result.repos.r!.seeds.map((s) => s.id).sort();

    expect(ids).toEqual(["n1", "s1", "s2"]);
    expect(result.repos.r!.edges).toContainEqual(["s1", "n1"]);
  });

  test("groups missing repo under __none__", async () => {
    const response = ndjsonResponse([
      { t: "meta", window_key: 1 },
      {
        t: "edge",
        id: "a",
        repo: null,
        content: "x",
        kind: "note",
        created_at: "2026",
        neighbor_id: null,
      },
      { t: "done", seeds: 1, neighbors: 0 },
    ]);
    const result = await parseNdjsonCandidates(response, 1);

    expect(result.repos.__none__).toBeDefined();
    expect(result.repos.__none__!.seeds[0]!.id).toBe("a");
  });

  test("throws when stream ends without done frame", async () => {
    const response = ndjsonResponse([
      { t: "meta", window_key: 1 },
      {
        t: "edge",
        id: "a",
        repo: "r",
        content: "x",
        kind: "note",
        created_at: "2026",
        neighbor_id: null,
      },
    ]);

    await expect(parseNdjsonCandidates(response, 1)).rejects.toThrow(/done frame/);
  });

  test("throws when server emits an error frame", async () => {
    const response = ndjsonResponse([
      { t: "meta", window_key: 1 },
      { t: "error", error: "db timeout" },
    ]);

    await expect(parseNdjsonCandidates(response, 1)).rejects.toThrow(/db timeout/);
  });

  test("throws on window_key mismatch", async () => {
    const response = ndjsonResponse([
      { t: "meta", window_key: 2 },
      { t: "done", seeds: 0, neighbors: 0 },
    ]);

    await expect(parseNdjsonCandidates(response, 1)).rejects.toThrow(/window_key mismatch/);
  });

  test("ignores unknown frames for forward-compat", async () => {
    const response = ndjsonResponse([
      { t: "meta", window_key: 1 },
      { t: "hb" },
      { t: "future_frame_kind", payload: 123 },
      {
        t: "edge",
        id: "a",
        repo: "r",
        content: "x",
        kind: "note",
        created_at: "2026",
        neighbor_id: null,
      },
      { t: "done", seeds: 1, neighbors: 0 },
    ]);
    const result = await parseNdjsonCandidates(response, 1);

    expect(result.repos.r!.seeds).toHaveLength(1);
  });
});

describe("runDreamCycle with NDJSON candidates", () => {
  test("consumes an NDJSON candidates stream end-to-end", async () => {
    const acceptHeaders: string[] = [];
    let postedClusters: { clusters: Array<{ member_ids: string[] }> } | null = null;
    const result = await runDreamCycle({
      serverUrl: "https://srv.test",
      token: "fake",
      machineId: "00000000-0000-0000-0000-000000000001",
      windowKey: 42,
      fetch: async (url: string, init: RequestInit) => {
        const path = new URL(url).pathname;
        const headers = (init.headers ?? {}) as Record<string, string>;

        if (path === "/api/dream/lock") {
          return new Response(JSON.stringify({ acquired: true, window_key: 42 }), {
            status: 200,
          });
        }

        if (path === "/api/dream/candidates") {
          acceptHeaders.push(headers.Accept ?? "");

          return ndjsonResponse([
            { t: "meta", window_key: 42 },
            {
              t: "edge",
              id: "a",
              repo: "r",
              content: "obs a",
              kind: "note",
              created_at: "2026",
              neighbor_id: "b",
            },
            {
              t: "edge",
              id: "b",
              repo: "r",
              content: "obs b",
              kind: "note",
              created_at: "2026",
              neighbor_id: "c",
            },
            {
              t: "edge",
              id: "c",
              repo: "r",
              content: "obs c",
              kind: "note",
              created_at: "2026",
              neighbor_id: null,
            },
            { t: "done", seeds: 3, neighbors: 0 },
          ]);
        }

        if (path === "/api/dream/clusters") {
          postedClusters = JSON.parse(init.body as string);

          return new Response(JSON.stringify({ written: 1, supersedes: 0 }), {
            status: 200,
          });
        }

        return new Response("not found", { status: 404 });
      },
      distill: async (members: Memory[]) => ({
        title: `cluster of ${members.length}`,
        summary: "topic",
      }),
    });

    expect(result.skipped).toBe(false);
    expect(acceptHeaders).toEqual(["application/x-ndjson"]);
    expect(postedClusters!.clusters).toHaveLength(1);
    expect(postedClusters!.clusters[0]!.member_ids.sort()).toEqual(["a", "b", "c"]);
  });
});
