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
// The supersede pass IS wired: after each distill, findSupersedes runs
// over the cluster's members and the resulting supersede_pairs ride along
// in the /api/dream/clusters submission. The server validates direction +
// membership before writing meta.superseded_by.

import { Logger } from "@mneme/core";
import type { DreamOutput, Memory, SupersedeCandidate, SupersedePair } from "./agents/types.ts";
import { type DistilledCluster, type DreamOutbox, clusterIdFor } from "./dream-outbox.ts";
import {
  DREAM_MAX_CLUSTER_SIZE,
  DREAM_MIN_CLUSTER_SIZE,
  DREAM_WINDOW_HOURS,
} from "./infra/config.ts";

const WINDOW_SECONDS = DREAM_WINDOW_HOURS * 3600;
const WINDOW_MINUTES = DREAM_WINDOW_HOURS * 60;

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

export function buildComponents(nodes: string[], edges: Array<[string, string]>): string[][] {
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
  /** Pre-computed bge-large vector of `summary`, so the server stores
   *  the cluster row with embedding populated and recall finds it via
   *  semantic search just like raw memories. Without this the cluster
   *  is keyword-searchable only (via tsv) and embed('...') queries
   *  miss it. */
  summary_embedding?: number[];
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
  /** Embed the cluster summary so the resulting cluster memory is
   *  semantically searchable. Same in-process bge-large pipeline that
   *  embeds new memories. Optional only because tests inject a mock. */
  embed?: (texts: string[]) => Promise<number[][]>;
  /** Optional supersede pass run after each cluster's distill. Skipped
   *  when omitted (e.g. providers that opt out for safety). */
  findSupersedes?: (candidates: SupersedeCandidate[]) => Promise<SupersedePair[]>;
  /** Per-cluster persistence. When provided, distill + supersede output
   *  is written to outbox/dream/<window>/distilled/<id>.json before any
   *  submit attempt, so a daemon crash doesn't lose Sonnet output.
   *  Tests pass undefined to skip persistence. */
  outbox?: DreamOutbox;
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
  const detail = await response.text().catch(() => "");
  throw new Error(`lock returned ${response.status}: ${detail.slice(0, 500)}`);
}

async function fetchCandidates(
  deps: DreamDeps,
  windowKey: number,
): Promise<DreamCandidatesResponse> {
  const url = `${deps.serverUrl}/api/dream/candidates?window_key=${windowKey}`;
  const response = await deps.fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${deps.token}`,
      Accept: "application/x-ndjson",
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`candidates returned ${response.status}: ${detail.slice(0, 500)}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-ndjson")) {
    return parseNdjsonCandidates(response, windowKey);
  }
  // Old server -- buffered JSON path. Backward-compat for one release.
  return (await response.json()) as DreamCandidatesResponse;
}

/** Read an NDJSON stream from /api/dream/candidates and assemble the
 *  per-repo seeds + edges. Frames:
 *    {t:"meta",   window_key}         once at the start
 *    {t:"edge",   id, repo, content, kind, created_at, neighbor_id}
 *    {t:"neighbor", id, repo, content, kind, created_at}
 *    {t:"error",  error}              terminal on server failure
 *    {t:"done",   seeds, neighbors}   terminal on success
 *  Unknown frames are ignored (forward-compat). The stream must reach
 *  the {t:"done"} frame -- a truncated stream throws so the lock can
 *  reap and the next cycle retries the same slice. */
export async function parseNdjsonCandidates(
  response: Response,
  expectedWindowKey: number,
): Promise<DreamCandidatesResponse> {
  if (!response.body) throw new Error("candidates: no response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const repos: DreamCandidatesResponse["repos"] = {};
  const seen = new Set<string>();
  let receivedWindowKey: number | null = null;
  let sawDone = false;
  let errorMessage: string | null = null;

  const addMemory = (
    repoKey: string,
    m: { id: string; content: string; kind: string; created_at: string },
  ): void => {
    if (seen.has(m.id)) return;
    repos[repoKey] ??= { seeds: [], edges: [] };
    repos[repoKey]!.seeds.push({
      id: m.id,
      content: m.content,
      kind: m.kind,
      created_at: m.created_at,
    });
    seen.add(m.id);
  };

  const handleFrame = (line: string): void => {
    if (!line.trim()) return;
    let msg: { t?: string; [k: string]: unknown };
    try {
      msg = JSON.parse(line);
    } catch {
      throw new Error(`candidates: malformed NDJSON line: ${line.slice(0, 120)}`);
    }
    switch (msg.t) {
      case "meta":
        receivedWindowKey = msg.window_key as number;
        break;
      case "edge": {
        const repoKey = (msg.repo as string | null) ?? "__none__";
        addMemory(repoKey, {
          id: msg.id as string,
          content: msg.content as string,
          kind: msg.kind as string,
          created_at: msg.created_at as string,
        });
        const neighborId = msg.neighbor_id as string | null;
        if (neighborId) {
          repos[repoKey] ??= { seeds: [], edges: [] };
          repos[repoKey]!.edges.push([msg.id as string, neighborId]);
        }
        break;
      }
      case "neighbor":
        addMemory((msg.repo as string | null) ?? "__none__", {
          id: msg.id as string,
          content: msg.content as string,
          kind: msg.kind as string,
          created_at: msg.created_at as string,
        });
        break;
      case "error":
        errorMessage = String(msg.error ?? "unknown");
        break;
      case "done":
        sawDone = true;
        break;
      default:
        /* unknown frame -- ignore for forward-compat */
        break;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      handleFrame(line);
    }
  }
  // Producers usually terminate with \n, but be defensive about a
  // trailing line without one.
  if (buf.trim()) handleFrame(buf);

  if (errorMessage) {
    throw new Error(`candidates stream errored: ${errorMessage}`);
  }
  if (!sawDone) {
    throw new Error("candidates stream ended without done frame");
  }
  if (receivedWindowKey !== expectedWindowKey) {
    throw new Error(
      `candidates window_key mismatch: expected ${expectedWindowKey}, got ${receivedWindowKey}`,
    );
  }
  return { window_key: receivedWindowKey, repos };
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
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`clusters returned ${response.status}: ${detail.slice(0, 500)}`);
  }
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
  const seedCount = Object.values(candidates.repos).reduce((sum, r) => sum + r.seeds.length, 0);
  Logger.info("dream: candidates fetched", {
    repos: repoCount,
    seeds: seedCount,
  });

  // Stage 1: distill (Sonnet) + supersede (Sonnet). Each successful
  // cluster is persisted to outbox/dream/<window>/distilled/ before we
  // move on, so a daemon crash here loses at most one in-flight
  // distill, never the previously-distilled clusters' Sonnet output.
  const distilledClusters: DistilledCluster[] = [];

  for (const [repo, repoData] of Object.entries(candidates.repos)) {
    const seedById = new Map<string, DreamSeed>();
    for (const s of repoData.seeds) seedById.set(s.id, s);

    const components = buildComponents([...seedById.keys()], repoData.edges);
    const eligible = components.filter(
      (c) => c.length >= DREAM_MIN_CLUSTER_SIZE && c.length <= DREAM_MAX_CLUSTER_SIZE,
    );
    if (eligible.length > 0) {
      Logger.info("dream: clusters found in repo", {
        repo,
        components: components.length,
        eligible: eligible.length,
      });
    }

    for (const memberIds of components) {
      if (memberIds.length < DREAM_MIN_CLUSTER_SIZE || memberIds.length > DREAM_MAX_CLUSTER_SIZE) {
        continue;
      }
      const cluster_id = await clusterIdFor(memberIds);

      // Idempotency: if a prior cycle already distilled this exact
      // cluster (same member set -> same cluster_id) and crashed before
      // submit, the file is still on disk. Skip re-paying tokens.
      if (deps.outbox) {
        const existsDistilled = (await deps.outbox.list(windowKey, "distilled")).includes(
          cluster_id,
        );
        const existsEmbedded = (await deps.outbox.list(windowKey, "embedded")).includes(cluster_id);
        if (existsDistilled || existsEmbedded) {
          Logger.info("dream: cluster already persisted, skipping distill", {
            size: memberIds.length,
            stage: existsEmbedded ? "embedded" : "distilled",
          });
          const stage = existsEmbedded ? "embedded" : "distilled";
          distilledClusters.push(await deps.outbox.read(windowKey, stage, cluster_id));
          continue;
        }
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

        // Supersede pass over cluster members. Both the distill and
        // supersede outputs are equally precious; persist them
        // together in the same distilled/<id>.json record.
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

        const cluster: DistilledCluster = {
          cluster_id,
          member_ids: memberIds,
          title: distilled.title,
          summary: distilled.summary,
          ...(supersede_pairs && supersede_pairs.length ? { supersede_pairs } : {}),
        };

        // Persist BEFORE the embed step, so a crash here keeps the
        // expensive Sonnet output safe (embed is cheap to redo).
        if (deps.outbox) {
          await deps.outbox.put(windowKey, "distilled", cluster);
        }
        distilledClusters.push(cluster);
      } catch (err) {
        Logger.warn("dream distill failed for cluster", err, { memberIds });
      }
    }
  }

  // Stage 2: embed every distilled cluster's summary, persist to
  // outbox/dream/<window>/embedded/. Cheap operation (TEI ~50ms each)
  // but persisting between stages means a crash mid-batch loses at
  // most one re-embed worth of work.
  for (const cluster of distilledClusters) {
    if (cluster.summary_embedding) continue; // resumed from embedded/, already done
    if (!deps.embed) continue; // tests skip embed
    try {
      const [vec] = await deps.embed([cluster.summary]);
      if (vec) cluster.summary_embedding = vec;
    } catch (err) {
      Logger.warn("dream: cluster summary embed failed", err, {
        cluster_id: cluster.cluster_id,
      });
    }
    if (deps.outbox) {
      await deps.outbox.transition(windowKey, "distilled", "embedded", cluster);
    }
  }

  // Stage 3: submit batch to server. ON CONFLICT idempotency at the
  // server side covers retries (re-submitting the same cluster_id is
  // a no-op).
  const submissions: ClusterSubmission[] = distilledClusters.map((c) => ({
    member_ids: c.member_ids,
    title: c.title,
    summary: c.summary,
    ...(c.summary_embedding ? { summary_embedding: c.summary_embedding } : {}),
    ...(c.supersede_pairs && c.supersede_pairs.length
      ? { supersede_pairs: c.supersede_pairs }
      : {}),
  }));

  Logger.info("dream: submitting clusters", { count: submissions.length });
  const result = await submitClusters(deps, windowKey, submissions);
  Logger.info("dream: clusters written", {
    submitted: submissions.length,
    written: result.written,
    supersedes: result.supersedes,
  });

  // Server confirmed write -> we can drop the outbox files. If submit
  // had failed, files would persist for the next attempt to re-submit
  // (cheap: just a server POST, no LLM cost).
  if (deps.outbox) {
    for (const cluster of distilledClusters) {
      await deps.outbox.delete(windowKey, "embedded", cluster.cluster_id);
    }
    await deps.outbox.cleanupWindow(windowKey);
  }

  return {
    skipped: false,
    clustersSubmitted: submissions.length,
    clustersWritten: result.written,
  };
}

/** Resume any unfinished dream cycles persisted in
 *  outbox/dream/<window>/. Called on daemon startup. For each window
 *  with outbox files: embed any distilled-but-not-yet-embedded
 *  clusters, then re-submit the embedded set. Skips windows with no
 *  files. Lock state in the server's _ops.dream_runs is not
 *  re-acquired - the original claim either still holds (we resume
 *  inside it) or has been auto-reaped, in which case the submit will
 *  return an error and the files stay around for human inspection. */
export async function resumeDreamCycles(
  deps: Pick<DreamDeps, "serverUrl" | "token" | "machineId" | "fetch" | "embed" | "outbox">,
): Promise<{ resumed: number; written: number }> {
  if (!deps.outbox) return { resumed: 0, written: 0 };
  const windows = await deps.outbox.listWindows();
  let resumedClusters = 0;
  let writtenClusters = 0;

  for (const windowKey of windows) {
    const distilledIds = await deps.outbox.list(windowKey, "distilled");
    const embeddedIds = await deps.outbox.list(windowKey, "embedded");
    const totalQueued = distilledIds.length + embeddedIds.length;
    if (totalQueued === 0) {
      await deps.outbox.cleanupWindow(windowKey);
      continue;
    }

    Logger.info("dream: resuming window", {
      window_key: windowKey,
      distilled: distilledIds.length,
      embedded: embeddedIds.length,
    });

    // Walk distilled/ first - embed each, transition to embedded/.
    for (const id of distilledIds) {
      const cluster = await deps.outbox.read(windowKey, "distilled", id);
      if (!cluster.summary_embedding && deps.embed) {
        try {
          const [vec] = await deps.embed([cluster.summary]);
          if (vec) cluster.summary_embedding = vec;
        } catch (err) {
          Logger.warn("dream: resume embed failed", err, { cluster_id: id });
        }
      }
      await deps.outbox.transition(windowKey, "distilled", "embedded", cluster);
    }

    // Now everything's in embedded/. Re-submit as one batch.
    const allIds = await deps.outbox.list(windowKey, "embedded");
    const clusters: DistilledCluster[] = [];
    for (const id of allIds) {
      clusters.push(await deps.outbox.read(windowKey, "embedded", id));
    }
    const submissions: ClusterSubmission[] = clusters.map((c) => ({
      member_ids: c.member_ids,
      title: c.title,
      summary: c.summary,
      ...(c.summary_embedding ? { summary_embedding: c.summary_embedding } : {}),
      ...(c.supersede_pairs && c.supersede_pairs.length
        ? { supersede_pairs: c.supersede_pairs }
        : {}),
    }));

    try {
      const result = await submitClusters(
        { ...deps, distill: () => Promise.reject(new Error("not used")) } as DreamDeps,
        windowKey,
        submissions,
      );
      Logger.info("dream: resume submitted", {
        window_key: windowKey,
        submitted: submissions.length,
        written: result.written,
      });
      resumedClusters += submissions.length;
      writtenClusters += result.written;
      // Success - drop the files.
      for (const id of allIds) {
        await deps.outbox.delete(windowKey, "embedded", id);
      }
      await deps.outbox.cleanupWindow(windowKey);
    } catch (err) {
      Logger.warn("dream: resume submit failed, files retained", err, {
        window_key: windowKey,
      });
    }
  }

  return { resumed: resumedClusters, written: writtenClusters };
}
