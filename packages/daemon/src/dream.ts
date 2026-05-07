// Daemon dream cycle.
//
// Each daemon runs this every 8h on a per-machine cron offset. The
// orchestration is HTTP-only:
//   1. POST /api/dream/lock         try to claim the window
//   2. (skip on 409)
//   3. GET  /api/dream/candidates   server runs the cosine-NN query
//   4. union-find connected components in TS
//   5. for each component sized 3-20: agent.distill -> {title, summary}
//   6. POST /api/dream/clusters     server validates and writes
//
// The server holds the lock + the DB; the daemon holds the LLM cost.
// Phase 1 supersede pass is omitted (the Claude provider's distill()
// returns just {title, summary}); a follow-up can wire supersede_pairs
// once the basic distill cycle is healthy.

import { Logger } from "@mneme/core";
import type {
  DreamOutput,
  Memory,
  SupersedeCandidate,
  SupersedePair,
} from "./agents/types.ts";

const WINDOW_HOURS = 8;
const WINDOW_SECONDS = WINDOW_HOURS * 3600;
const WINDOW_MINUTES = WINDOW_HOURS * 60;
const MIN_CLUSTER_SIZE = 3;
const MAX_CLUSTER_SIZE = 20;

export function computeWindowKey(date = new Date()): number {
  return Math.floor(date.getTime() / 1000 / WINDOW_SECONDS);
}

// Stable, deterministic offset within the 8h window. Daemons running on
// the same physical clock never schedule simultaneously because every
// machine_id maps to a different minute-mark via this hash.
export function computeCronOffsetMinutes(machineId: string): number {
  let h = 0;
  for (let i = 0; i < machineId.length; i++) {
    h = (h * 31 + machineId.charCodeAt(i)) | 0;
  }
  // unsigned 32-bit then modulo for positive offset
  const u = h >>> 0;
  return u % WINDOW_MINUTES;
}

export function buildComponents(
  nodes: string[],
  edges: Array<[string, string]>,
): string[][] {
  const parent = new Map<string, string>();
  for (const id of nodes) parent.set(id, id);

  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const [a, b] of edges) {
    if (parent.has(a) && parent.has(b)) union(a, b);
  }

  const groups = new Map<string, string[]>();
  for (const id of nodes) {
    const root = find(id);
    const list = groups.get(root);
    if (list) list.push(id);
    else groups.set(root, [id]);
  }
  return [...groups.values()];
}

export type DreamSeed = {
  id: string;
  content: string;
  kind: string;
  created_at: string;
};

export type DreamCandidatesResponse = {
  window_key: number;
  repos: Record<string, { seeds: DreamSeed[]; edges: Array<[string, string]> }>;
};

export type ClusterSubmission = {
  member_ids: string[];
  title: string;
  summary: string;
  supersede_pairs?: SupersedePair[];
};

export type DreamCycleResult = {
  skipped: boolean;
  reason?: string;
  clustersSubmitted?: number;
  clustersWritten?: number;
};

export type DreamDeps = {
  serverUrl: string;
  token: string;
  machineId: string;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  distill: (memories: Memory[]) => Promise<DreamOutput>;
  /** Optional supersede pass run after each cluster's distill. Skipped
   *  when omitted (e.g. providers that opt out for safety). */
  findSupersedes?: (
    candidates: SupersedeCandidate[],
  ) => Promise<SupersedePair[]>;
  /** Override the window for tests. Production calls computeWindowKey(). */
  windowKey?: number;
};

async function lockWindow(
  deps: DreamDeps,
  windowKey: number,
): Promise<{ acquired: boolean; heldBy?: string }> {
  const response = await deps.fetch(`${deps.serverUrl}/api/dream/lock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deps.token}`,
    },
    body: JSON.stringify({ window_key: windowKey }),
  });
  if (response.status === 200) return { acquired: true };
  if (response.status === 409) {
    const body = (await response.json().catch(() => ({}))) as {
      heldBy?: string;
    };
    return { acquired: false, heldBy: body.heldBy };
  }
  throw new Error(`lock returned ${response.status}`);
}

async function fetchCandidates(
  deps: DreamDeps,
  windowKey: number,
): Promise<DreamCandidatesResponse> {
  const url = `${deps.serverUrl}/api/dream/candidates?window_key=${windowKey}`;
  const response = await deps.fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${deps.token}` },
  });
  if (!response.ok) throw new Error(`candidates returned ${response.status}`);
  return (await response.json()) as DreamCandidatesResponse;
}

async function submitClusters(
  deps: DreamDeps,
  windowKey: number,
  clusters: ClusterSubmission[],
): Promise<{ written: number; supersedes: number }> {
  const response = await deps.fetch(`${deps.serverUrl}/api/dream/clusters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deps.token}`,
    },
    body: JSON.stringify({ window_key: windowKey, clusters }),
  });
  if (!response.ok) throw new Error(`clusters returned ${response.status}`);
  return (await response.json()) as { written: number; supersedes: number };
}

export async function runDreamCycle(deps: DreamDeps): Promise<DreamCycleResult> {
  const windowKey = deps.windowKey ?? computeWindowKey();
  Logger.info("dream: attempting lock", { window_key: windowKey });

  const lock = await lockWindow(deps, windowKey);
  if (!lock.acquired) {
    Logger.info("dream: skipped (lock held)", {
      window_key: windowKey,
      held_by: lock.heldBy ?? "unknown",
    });
    return { skipped: true, reason: `held by ${lock.heldBy ?? "unknown"}` };
  }
  Logger.info("dream: lock acquired", { window_key: windowKey });

  const candidates = await fetchCandidates(deps, windowKey);
  const repoCount = Object.keys(candidates.repos).length;
  const seedCount = Object.values(candidates.repos).reduce(
    (sum, r) => sum + r.seeds.length,
    0,
  );
  Logger.info("dream: candidates fetched", {
    repos: repoCount,
    seeds: seedCount,
  });

  const submissions: ClusterSubmission[] = [];

  for (const [repo, repoData] of Object.entries(candidates.repos)) {
    const seedById = new Map<string, DreamSeed>();
    for (const s of repoData.seeds) seedById.set(s.id, s);

    const components = buildComponents(
      [...seedById.keys()],
      repoData.edges,
    );
    const eligible = components.filter(
      (c) => c.length >= MIN_CLUSTER_SIZE && c.length <= MAX_CLUSTER_SIZE,
    );
    if (eligible.length > 0) {
      Logger.info("dream: clusters found in repo", {
        repo,
        components: components.length,
        eligible: eligible.length,
      });
    }

    for (const memberIds of components) {
      if (
        memberIds.length < MIN_CLUSTER_SIZE ||
        memberIds.length > MAX_CLUSTER_SIZE
      ) {
        continue;
      }
      const memberMemories: Memory[] = memberIds.map((id) => {
        const s = seedById.get(id)!;
        return {
          content: s.content,
          content_hash: "",
          chunk_id: "",
          kind: s.kind,
          importance: 0.6,
          topics: [],
          meta: {},
        };
      });
      Logger.info("dream: distilling cluster", { size: memberIds.length });
      const tDistill = Date.now();
      try {
        const distilled = await deps.distill(memberMemories);
        Logger.info("dream: distilled", {
          size: memberIds.length,
          title: distilled.title,
          ms: Date.now() - tDistill,
        });

        // Optional supersede pass over cluster members. Adjacent-
        // neighbor inclusion (the original architecture's pattern) would
        // require asking the server for cosine-near non-cluster
        // memories; for Phase 1 we run the pass over members only,
        // which catches the most common rephrasing-supersedes-prior
        // case while keeping the daemon's HTTP surface minimal.
        let supersede_pairs: SupersedePair[] | undefined;
        if (deps.findSupersedes && memberIds.length >= 2) {
          try {
            const candidates: SupersedeCandidate[] = memberIds.map((id) => {
              const s = seedById.get(id)!;
              return {
                id,
                content: s.content,
                kind: s.kind,
                created_at: s.created_at,
              };
            });
            supersede_pairs = await deps.findSupersedes(candidates);
          } catch (err) {
            Logger.warn("dream supersede pass failed", err, { memberIds });
          }
        }

        submissions.push({
          member_ids: memberIds,
          title: distilled.title,
          summary: distilled.summary,
          ...(supersede_pairs && supersede_pairs.length
            ? { supersede_pairs }
            : {}),
        });
      } catch (err) {
        // Per-cluster failure isolation: one bad LLM call does not
        // crash the cycle. Other clusters proceed.
        Logger.warn("dream distill failed for cluster", err, { memberIds });
      }
    }
  }

  Logger.info("dream: submitting clusters", { count: submissions.length });
  const result = await submitClusters(deps, windowKey, submissions);
  Logger.info("dream: clusters written", {
    submitted: submissions.length,
    written: result.written,
    supersedes: result.supersedes,
  });
  return {
    skipped: false,
    clustersSubmitted: submissions.length,
    clustersWritten: result.written,
  };
}
