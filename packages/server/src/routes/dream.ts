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
import { DREAM_CLUSTER_DISTANCE, DREAM_MAX_NEIGHBORS_PER_MEMORY } from "../infra/config.ts";
import { validateSupersedePairs } from "../lib/supersede.ts";
import { sha256Hex, sql } from "../infra/db.ts";
import { EMBEDDER_DIM } from "../embedder/index.ts";

// HNSW lookups against memories.embedding take ~50ms per probe in
// practice (the index is global; per-repo filtering forces deep
// traversal). Without a cap, a fresh fleet with thousands of
// never-clustered memories blows past Railway's gateway timeout. The
// architecture's intent is "recent (last 7d) OR never-processed", so
// we order by created_at DESC and cap. Multiple dream cycles drain
// the inaugural backlog; steady state (~50 new memories/day) is
// always far below this limit.
const DREAM_MAX_CANDIDATES_PER_CYCLE = 500;

export type DreamLockResult =
  | { acquired: true; window_key: number }
  | { acquired: false; window_key: number; heldBy: string };

// Stale claims older than this are eligible for auto-reap inside the
// lock-acquire path. Dream cycles in practice run in well under 5 min;
// 30 min is generous enough that we don't reap a slow-but-live cycle,
// and tight enough that a crashed daemon's lock self-heals instead of
// blocking the window forever.
const STALE_LOCK_AGE_MS = 30 * 60_000;

export async function acquireDreamLock(
  windowKey: number,
  machineId: string,
): Promise<DreamLockResult> {
  // First-time acquire: simple INSERT ON CONFLICT.
  const inserted = await sql<{ claimed_by_machine_id: string }[]>`
    INSERT INTO _ops.dream_runs (window_key, claimed_by_machine_id)
    VALUES (${windowKey}, ${machineId})
    ON CONFLICT (window_key) DO NOTHING
    RETURNING claimed_by_machine_id
  `;
  if (inserted.length > 0) {
    return { acquired: true, window_key: windowKey };
  }

  // Conflict path: existing row. If it's a stale crashed claim
  // (completed_at IS NULL and old enough), reap it and retry the
  // insert. Otherwise, surface the holder to the caller.
  const reaped = await sql<{ claimed_by_machine_id: string }[]>`
    DELETE FROM _ops.dream_runs
    WHERE window_key = ${windowKey}
      AND completed_at IS NULL
      AND claimed_at < now() - (${STALE_LOCK_AGE_MS}::bigint || ' milliseconds')::interval
    RETURNING claimed_by_machine_id
  `;
  if (reaped.length > 0) {
    Logger.info("dream: reaped stale lock", {
      window_key: windowKey,
      previous_holder: reaped[0]?.claimed_by_machine_id,
    });
    const retry = await sql<{ claimed_by_machine_id: string }[]>`
      INSERT INTO _ops.dream_runs (window_key, claimed_by_machine_id)
      VALUES (${windowKey}, ${machineId})
      ON CONFLICT (window_key) DO NOTHING
      RETURNING claimed_by_machine_id
    `;
    if (retry.length > 0) {
      return { acquired: true, window_key: windowKey };
    }
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
  content: string;
  kind: string;
  created_at: Date;
};

type NeighborRow = {
  id: string;
  repo: string | null;
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

/** Build the per-repo candidate map from the seed+edge scan rows plus
 *  the separately-fetched neighbor rows. Seeds and neighbors both land
 *  in `seeds` (the daemon treats every entry as a cluster-eligible
 *  node); the field keeps its name for wire compatibility with
 *  already-deployed daemons. Pure -- no DB access. */
export function assembleRepos(
  edgeRows: EdgeRow[],
  neighborRows: NeighborRow[],
): DreamCandidates["repos"] {
  const repos: DreamCandidates["repos"] = {};
  const seen = new Set<string>();

  const addMemory = (
    repoKey: string,
    m: { id: string; content: string; kind: string; created_at: Date },
  ): void => {
    repos[repoKey] ??= { seeds: [], edges: [] };
    if (seen.has(m.id)) return;
    repos[repoKey]!.seeds.push({
      id: m.id,
      content: m.content,
      kind: m.kind,
      created_at: m.created_at.toISOString(),
    });
    seen.add(m.id);
  };

  for (const row of edgeRows) {
    const repoKey = row.repo ?? "__none__";
    addMemory(repoKey, row);
    if (row.neighbor_id) {
      repos[repoKey]!.edges.push([row.id, row.neighbor_id]);
    }
  }
  for (const n of neighborRows) {
    addMemory(n.repo ?? "__none__", n);
  }
  return repos;
}

export async function fetchDreamCandidates(
  windowKey: number,
  machineId: string,
): Promise<{ candidates: DreamCandidates; seedIds: string[] }> {
  // Inlined predicates (no CTE materialization) keep pgvector's HNSW
  // index usable on the LATERAL's cosine ORDER BY -- see git history
  // for why a materialized CTE times out at Railway's gateway.
  //
  // Seed selection is now a round-robin: least-recently-dreamed rows
  // first (NULLS FIRST drains never-dreamed rows), so every memory is
  // eventually a seed regardless of age. Backed by
  // memories_last_dreamed_at_idx (migration 0027).
  const edgeRows = await sql<EdgeRow[]>`
    WITH seeds AS (
      SELECT id, repo, embedding, content, kind, created_at
      FROM memories
      WHERE archived_at IS NULL
        AND embedding IS NOT NULL
        AND kind <> 'cluster'
        AND (private = false OR machine_id = ${machineId})
        AND NOT COALESCE((meta->>'pinned')::boolean, false)
        AND (meta->>'shadow_of') IS NULL
        AND (meta->>'superseded_by') IS NULL
        AND (meta->>'in_cluster') IS NULL
      ORDER BY meta->>'last_dreamed_at' NULLS FIRST, created_at ASC
      LIMIT ${DREAM_MAX_CANDIDATES_PER_CYCLE}
    )
    SELECT
      s.id, s.repo, s.content, s.kind, s.created_at,
      n.neighbor_id
    FROM seeds s
    LEFT JOIN LATERAL (
      SELECT m.id AS neighbor_id
      FROM memories m
      WHERE m.archived_at IS NULL
        AND m.embedding IS NOT NULL
        AND m.kind <> 'cluster'
        AND (m.private = false OR m.machine_id = ${machineId})
        AND NOT COALESCE((m.meta->>'pinned')::boolean, false)
        AND (m.meta->>'shadow_of') IS NULL
        AND (m.meta->>'superseded_by') IS NULL
        AND (m.meta->>'in_cluster') IS NULL
        AND m.repo IS NOT DISTINCT FROM s.repo
        AND m.id <> s.id
        AND s.embedding <=> m.embedding < ${DREAM_CLUSTER_DISTANCE}
      ORDER BY s.embedding <=> m.embedding
      LIMIT ${DREAM_MAX_NEIGHBORS_PER_MEMORY}
    ) n ON true
  `;

  const seedIds = [...new Set(edgeRows.map((r) => r.id))];
  const seedIdSet = new Set(seedIds);
  const neighborIds = [
    ...new Set(
      edgeRows
        .map((r) => r.neighbor_id)
        .filter((nid): nid is string => nid !== null && !seedIdSet.has(nid)),
    ),
  ];

  // Neighbors that are not themselves seeds still need full content so
  // the daemon can distill a cluster that includes them. One extra
  // fetch by id -- the LATERAL already applied every eligibility filter.
  const neighborRows = neighborIds.length
    ? await sql<NeighborRow[]>`
        SELECT id, repo, content, kind, created_at
        FROM memories
        WHERE id = ANY(${neighborIds})
      `
    : [];

  return {
    candidates: { window_key: windowKey, repos: assembleRepos(edgeRows, neighborRows) },
    seedIds,
  };
}

/** Stamp meta.last_dreamed_at = now() on the given seed ids. Called by
 *  the candidates route once per dream cycle so the next cycle's
 *  watermark-ordered seed selection advances past these rows. Stamping
 *  at fetch time (not cluster-write time) is crash-safe: a daemon that
 *  dies mid-cycle does not lose the stamp. */
export async function stampDreamedSeeds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await sql`
    UPDATE memories
    SET meta = jsonb_set(COALESCE(meta, '{}'::jsonb),
                         '{last_dreamed_at}', to_jsonb(now()::text))
    WHERE id = ANY(${ids})
  `;
}

type ClusterSubmission = {
  member_ids: string[];
  title: string;
  summary: string;
  /** Optional bge-large vector of the summary. When present the cluster
   *  row gets embedding + embedding_model populated, so semantic recall
   *  finds it. When absent, the row is keyword-only via tsv. */
  summary_embedding?: number[];
  supersede_pairs?: Array<{ old_id: string; new_id: string; reason: string }>;
};

export type ClustersBody = {
  window_key: number;
  clusters: ClusterSubmission[];
};

export type ClustersValidation = { ok: true; body: ClustersBody } | { ok: false; error: string };

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
    if (
      c.summary_embedding !== undefined &&
      (!Array.isArray(c.summary_embedding) || c.summary_embedding.length !== EMBEDDER_DIM)
    ) {
      return {
        ok: false,
        error: `clusters[${i}].summary_embedding must be a ${EMBEDDER_DIM}-dim array if present`,
      };
    }
  }
  return { ok: true, body: b as ClustersBody };
}

export async function writeClusters(
  body: ClustersBody,
  machineId: string,
): Promise<{ written: number; supersedes: number; supersedes_rejected: number }> {
  let written = 0;
  let supersedes = 0;
  let supersedesRejected = 0;

  await sql.begin(async (tx) => {
    for (const cluster of body.clusters) {
      // Pull the seed memory for inheritance (machine_id, repo on the
      // cluster row mirror the seed). Same shape as the existing dream
      // worker's write path.
      const [seed] = await tx<
        {
          capture_id: string;
          repo: string | null;
          machine_id: string;
          harness: string;
          agent: string | null;
        }[]
      >`
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

      // chunk_id is NOT NULL on memories. Same scheme as the bundle
      // path: sha256(content) -> content_hash, sha256(content_hash +
      // ":" + embedding_model) -> chunk_id. Always set embedding_model
      // to the canonical name even when the embedding itself is null,
      // so chunk_id is deterministic and ON CONFLICT dedupes
      // re-runs of the same cluster.
      const embeddingModel = "BAAI/bge-large-en-v1.5";
      const contentHash = await sha256Hex(cluster.summary);
      const chunkId = await sha256Hex(`${contentHash}:${embeddingModel}`);
      const vectorLiteral = cluster.summary_embedding
        ? `[${cluster.summary_embedding.join(",")}]`
        : null;
      const [clusterRow] = await tx<{ id: string }[]>`
        INSERT INTO memories (
          capture_id, chunk_id, content, content_hash,
          kind, importance,
          machine_id, repo, harness, agent, topics, private,
          tsv, meta,
          embedding, embedding_model
        )
        VALUES (
          ${seed.capture_id}, ${chunkId}, ${cluster.summary}, ${contentHash},
          'cluster', 0.8,
          ${seed.machine_id}, ${seed.repo}, ${seed.harness}, ${seed.agent},
          '{}'::text[], false,
          to_tsvector('english', ${cluster.summary}),
          ${sql.json(meta as never)},
          ${vectorLiteral}::vector, ${embeddingModel}
        )
        ON CONFLICT (chunk_id) DO NOTHING
        RETURNING id
      `;
      // ON CONFLICT no-op means a prior dream wrote this exact cluster
      // (same summary + same embedder). Look up the existing row's id
      // so we still apply meta.in_cluster to any members that weren't
      // marked yet (e.g. prior cycle crashed between cluster INSERT
      // and member UPDATE). If we skipped, a deterministic NN graph
      // plus unmarked members would re-distill the same content
      // forever.
      let clusterId: string;
      if (clusterRow) {
        clusterId = clusterRow.id;
        written++;
      } else {
        const [existing] = await tx<{ id: string }[]>`
          SELECT id FROM memories WHERE chunk_id = ${chunkId} LIMIT 1
        `;
        if (!existing) continue;
        clusterId = existing.id;
      }

      await tx`
        UPDATE memories
        SET meta = meta || jsonb_build_object('in_cluster', ${clusterId}::text)
        WHERE id = ANY(${cluster.member_ids})
          AND (meta->>'in_cluster') IS NULL
      `;

      // Validate supersede pairs against authoritative DB timestamps before
      // applying. Candidate set = the cluster's own member_ids (findSupersedes
      // is fed members only). Fetch by id with no archived_at filter: an
      // archived member is still a valid supersede participant; a missing id
      // means a non-existent (hallucinated) id, which is a correct rejection.
      const pairs = cluster.supersede_pairs ?? [];
      if (pairs.length > 0) {
        const memberRows = await tx<{ id: string; created_at: Date }[]>`
          SELECT id::text AS id, created_at
          FROM memories
          WHERE id = ANY(${cluster.member_ids})
        `;
        const { valid, rejected } = validateSupersedePairs(pairs, memberRows);
        for (const r of rejected) {
          Logger.warn("dream: supersede pair rejected", undefined, {
            reason: r.reason,
            old_id: r.pair.old_id,
            new_id: r.pair.new_id,
          });
          supersedesRejected++;
        }
        for (const pair of valid) {
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
  return { written, supersedes, supersedes_rejected: supersedesRejected };
}

export async function clearStaleDreamLocks(
  maxAgeSeconds: number,
): Promise<{ cleared: number; window_keys: number[] }> {
  const rows = await sql<{ window_key: number }[]>`
    DELETE FROM _ops.dream_runs
    WHERE completed_at IS NULL
      AND claimed_at < now() - (${maxAgeSeconds}::bigint || ' seconds')::interval
    RETURNING window_key
  `;
  return { cleared: rows.length, window_keys: rows.map((r) => Number(r.window_key)) };
}

export function mountDreamRoutes(app: Hono): void {
  // Admin: force-clear stale dream locks. Useful when a 30-min auto-reap
  // hasn't elapsed yet but you know the holder crashed (e.g. you killed
  // the daemon mid-cycle). Body: { max_age_seconds }, defaults to 60.
  app.post(
    "/api/dream/clear-stale",
    mnemeRoute("api.dream.clear_stale"),
    requireAuth("admin"),
    async (c) => {
      const body = (await c.req.json().catch(() => ({}))) as
        | { max_age_seconds?: unknown }
        | undefined;
      const maxAge =
        body && typeof body.max_age_seconds === "number" && body.max_age_seconds > 0
          ? body.max_age_seconds
          : 60;
      const result = await clearStaleDreamLocks(maxAge);
      Logger.info("dream: stale locks cleared", {
        ...result,
        max_age_seconds: maxAge,
      });
      return c.json(result);
    },
  );

  app.post("/api/dream/lock", mnemeRoute("api.dream.lock"), requireAuth("capture"), async (c) => {
    const body = (await c.req.json().catch(() => null)) as { window_key?: unknown } | null;
    const windowKey = body && typeof body.window_key === "number" ? body.window_key : NaN;
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
  });

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
      const { candidates, seedIds } = await fetchDreamCandidates(windowKey, auth.machineId);
      await stampDreamedSeeds(seedIds);
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
