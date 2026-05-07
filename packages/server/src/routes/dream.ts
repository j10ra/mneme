// Dream coordination endpoints (issue #22).
//
// The daemon owns the LLM cost (one Claude call per cluster); the server
// owns the lock + the candidate query + the cluster write. Three routes:
//
//   POST /api/dream/lock      - try to claim a window via _ops.dream_runs
//   GET  /api/dream/candidates - return eligible memories + cosine-NN edges
//                                for the bearer's machine, filtered to
//                                public + own-machine private rows
//   POST /api/dream/clusters  - daemon submits {member_ids, title, summary}
//                                results from its LLM calls; server writes
//                                cluster rows + member meta.in_cluster +
//                                supersede pairs in one transaction
//
// Leader election uses a durable claim row keyed on window_key
// (floor(now()/8h)). INSERT ON CONFLICT DO NOTHING is the race primitive.
// completed_at + cluster_count are stamped at /api/dream/clusters time.
// Stale claims (no completed_at after 30min) are reaped by nap.

import { Hono } from "hono";
import { Logger, currentAuth, mnemeRoute, requireAuth } from "@mneme/core";
import {
  DREAM_CLUSTER_DISTANCE,
  DREAM_MAX_NEIGHBORS_PER_MEMORY,
} from "../infra/config.ts";
import { sql } from "../infra/db.ts";

export type DreamLockResult =
  | { acquired: true; window_key: number }
  | { acquired: false; window_key: number; heldBy: string };

export async function acquireDreamLock(
  windowKey: number,
  machineId: string,
): Promise<DreamLockResult> {
  const inserted = await sql<{ claimed_by_machine_id: string }[]>`
    INSERT INTO _ops.dream_runs (window_key, claimed_by_machine_id)
    VALUES (${windowKey}, ${machineId})
    ON CONFLICT (window_key) DO NOTHING
    RETURNING claimed_by_machine_id
  `;
  if (inserted.length > 0) {
    return { acquired: true, window_key: windowKey };
  }
  const existing = await sql<{ claimed_by_machine_id: string }[]>`
    SELECT claimed_by_machine_id FROM _ops.dream_runs WHERE window_key = ${windowKey}
  `;
  return {
    acquired: false,
    window_key: windowKey,
    heldBy: existing[0]?.claimed_by_machine_id ?? "unknown",
  };
}

export async function releaseDreamLock(
  windowKey: number,
  machineId: string,
  clusterCount: number,
): Promise<void> {
  await sql`
    UPDATE _ops.dream_runs
    SET completed_at = now(), cluster_count = ${clusterCount}
    WHERE window_key = ${windowKey} AND claimed_by_machine_id = ${machineId}
  `;
}

type EdgeRow = {
  id: string;
  repo: string | null;
  neighbor_id: string | null;
  embedding: number[] | null;
  content: string;
  kind: string;
  created_at: Date;
};

export type DreamCandidates = {
  window_key: number;
  repos: Record<
    string,
    {
      seeds: Array<{
        id: string;
        content: string;
        kind: string;
        created_at: string;
      }>;
      edges: Array<[string, string]>;
    }
  >;
};

export async function fetchDreamCandidates(
  windowKey: number,
  machineId: string,
): Promise<DreamCandidates> {
  // Same WHERE clause as today's runDreamOnce, with the privacy filter
  // relaxed: caller sees public rows + their own private rows. Other
  // machines' privates stay invisible.
  const rows = await sql<EdgeRow[]>`
    WITH candidates AS (
      SELECT id, embedding, repo, content, kind, created_at
      FROM memories
      WHERE archived_at IS NULL
        AND embedding IS NOT NULL
        AND kind <> 'cluster'
        AND (private = false OR machine_id = ${machineId})
        AND NOT COALESCE((meta->>'pinned')::boolean, false)
        AND (meta->>'shadow_of') IS NULL
        AND (meta->>'superseded_by') IS NULL
        AND (meta->>'in_cluster') IS NULL
    )
    SELECT
      c.id, c.repo, c.content, c.kind, c.created_at,
      n.neighbor_id, c.embedding
    FROM candidates c
    LEFT JOIN LATERAL (
      SELECT m.id AS neighbor_id
      FROM candidates m
      WHERE m.repo IS NOT DISTINCT FROM c.repo
        AND m.id <> c.id
        AND c.embedding <=> m.embedding < ${DREAM_CLUSTER_DISTANCE}
      ORDER BY c.embedding <=> m.embedding
      LIMIT ${DREAM_MAX_NEIGHBORS_PER_MEMORY}
    ) n ON true
  `;

  const repos: DreamCandidates["repos"] = {};
  const seenSeed = new Set<string>();

  for (const row of rows) {
    const repoKey = row.repo ?? "__none__";
    repos[repoKey] ??= { seeds: [], edges: [] };
    if (!seenSeed.has(row.id)) {
      repos[repoKey]!.seeds.push({
        id: row.id,
        content: row.content,
        kind: row.kind,
        created_at:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : String(row.created_at),
      });
      seenSeed.add(row.id);
    }
    if (row.neighbor_id) {
      repos[repoKey]!.edges.push([row.id, row.neighbor_id]);
    }
  }

  return { window_key: windowKey, repos };
}

type ClusterSubmission = {
  member_ids: string[];
  title: string;
  summary: string;
  supersede_pairs?: Array<{ old_id: string; new_id: string; reason: string }>;
};

export type ClustersBody = {
  window_key: number;
  clusters: ClusterSubmission[];
};

export type ClustersValidation =
  | { ok: true; body: ClustersBody }
  | { ok: false; error: string };

export function validateClustersBody(input: unknown): ClustersValidation {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "body must be an object" };
  }
  const b = input as { window_key?: unknown; clusters?: unknown };
  if (typeof b.window_key !== "number") {
    return { ok: false, error: "window_key required" };
  }
  if (!Array.isArray(b.clusters)) {
    return { ok: false, error: "clusters[] required" };
  }
  for (let i = 0; i < b.clusters.length; i++) {
    const c = b.clusters[i] as Record<string, unknown> | undefined;
    if (!c) return { ok: false, error: `clusters[${i}] missing` };
    if (
      !Array.isArray(c.member_ids) ||
      c.member_ids.length === 0 ||
      !c.member_ids.every((m) => typeof m === "string")
    ) {
      return {
        ok: false,
        error: `clusters[${i}].member_ids must be a non-empty string array`,
      };
    }
    if (typeof c.title !== "string" || !c.title.trim()) {
      return { ok: false, error: `clusters[${i}].title required` };
    }
    if (typeof c.summary !== "string" || !c.summary.trim()) {
      return { ok: false, error: `clusters[${i}].summary required` };
    }
  }
  return { ok: true, body: b as ClustersBody };
}

export async function writeClusters(
  body: ClustersBody,
  machineId: string,
): Promise<{ written: number; supersedes: number }> {
  let written = 0;
  let supersedes = 0;

  await sql.begin(async (tx) => {
    for (const cluster of body.clusters) {
      // Pull the seed memory for inheritance (machine_id, repo on the
      // cluster row mirror the seed). Same shape as the existing dream
      // worker's write path.
      const [seed] = await tx<{
        capture_id: string;
        repo: string | null;
        machine_id: string;
        harness: string;
        agent: string | null;
      }[]>`
        SELECT capture_id, repo, machine_id, harness, agent
        FROM memories
        WHERE id = ${cluster.member_ids[0]!}
      `;
      if (!seed) continue;

      const meta = {
        cluster_title: cluster.title,
        member_ids: cluster.member_ids,
        distiller_provider: "anthropic",
        distiller_model: "claude-sonnet",
      };

      const [clusterRow] = await tx<{ id: string }[]>`
        INSERT INTO memories (
          capture_id, content, kind, importance,
          machine_id, repo, harness, agent, topics, private,
          tsv, meta
        )
        VALUES (
          ${seed.capture_id}, ${cluster.summary}, 'cluster', 0.8,
          ${seed.machine_id}, ${seed.repo}, ${seed.harness}, ${seed.agent},
          '{}'::text[], false,
          to_tsvector('english', ${cluster.summary}),
          ${sql.json(meta as never)}
        )
        RETURNING id
      `;
      const clusterId = clusterRow!.id;
      written++;

      await tx`
        UPDATE memories
        SET meta = meta || jsonb_build_object('in_cluster', ${clusterId}::text)
        WHERE id = ANY(${cluster.member_ids})
          AND (meta->>'in_cluster') IS NULL
      `;

      for (const pair of cluster.supersede_pairs ?? []) {
        if (
          typeof pair.old_id === "string" &&
          typeof pair.new_id === "string" &&
          pair.old_id !== pair.new_id
        ) {
          await tx`
            UPDATE memories
            SET meta = meta || jsonb_build_object('superseded_by', ${pair.new_id}::text)
            WHERE id = ${pair.old_id} AND (meta->>'superseded_by') IS NULL
          `;
          supersedes++;
        }
      }
    }
  });

  await releaseDreamLock(body.window_key, machineId, written);
  return { written, supersedes };
}

export function mountDreamRoutes(app: Hono): void {
  app.post(
    "/api/dream/lock",
    mnemeRoute("api.dream.lock"),
    requireAuth("capture"),
    async (c) => {
      const body = (await c.req.json().catch(() => null)) as
        | { window_key?: unknown }
        | null;
      const windowKey =
        body && typeof body.window_key === "number" ? body.window_key : NaN;
      if (!Number.isFinite(windowKey)) {
        return c.json({ error: "window_key required" }, 400);
      }
      const auth = currentAuth();
      if (!auth?.machineId) {
        return c.json({ error: "dream lock requires per-machine token" }, 400);
      }
      const result = await acquireDreamLock(windowKey, auth.machineId);
      if (result.acquired) return c.json(result);
      return c.json(result, 409);
    },
  );

  app.get(
    "/api/dream/candidates",
    mnemeRoute("api.dream.candidates"),
    requireAuth("capture"),
    async (c) => {
      const auth = currentAuth();
      if (!auth?.machineId) {
        return c.json({ error: "candidates require per-machine token" }, 400);
      }
      const windowKeyStr = c.req.query("window_key");
      const windowKey = windowKeyStr ? Number(windowKeyStr) : NaN;
      if (!Number.isFinite(windowKey)) {
        return c.json({ error: "window_key required" }, 400);
      }
      // Verify caller actually holds this window's lock.
      const rows = await sql<{ claimed_by_machine_id: string; completed_at: Date | null }[]>`
        SELECT claimed_by_machine_id, completed_at
        FROM _ops.dream_runs
        WHERE window_key = ${windowKey}
      `;
      if (
        !rows[0] ||
        rows[0].claimed_by_machine_id !== auth.machineId ||
        rows[0].completed_at !== null
      ) {
        return c.json({ error: "lock not held by caller" }, 403);
      }
      const candidates = await fetchDreamCandidates(windowKey, auth.machineId);
      return c.json(candidates);
    },
  );

  app.post(
    "/api/dream/clusters",
    mnemeRoute("api.dream.clusters"),
    requireAuth("capture"),
    async (c) => {
      const auth = currentAuth();
      if (!auth?.machineId) {
        return c.json({ error: "clusters submit requires per-machine token" }, 400);
      }
      const raw = await c.req.json().catch(() => null);
      const validation = validateClustersBody(raw);
      if (!validation.ok) return c.json({ error: validation.error }, 400);

      const rows = await sql<{ claimed_by_machine_id: string; completed_at: Date | null }[]>`
        SELECT claimed_by_machine_id, completed_at
        FROM _ops.dream_runs
        WHERE window_key = ${validation.body.window_key}
      `;
      if (
        !rows[0] ||
        rows[0].claimed_by_machine_id !== auth.machineId ||
        rows[0].completed_at !== null
      ) {
        return c.json({ error: "lock not held by caller" }, 403);
      }

      const result = await writeClusters(validation.body, auth.machineId);
      Logger.info("dream clusters written", {
        window_key: validation.body.window_key,
        ...result,
      });
      return c.json(result);
    },
  );
}
