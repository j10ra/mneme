import { Logger, mnemeFn } from "@mneme/core";
import {
  DREAM_CLUSTER_DISTANCE,
  DREAM_MAX_CLUSTER_SIZE,
  DREAM_MAX_NEIGHBORS_PER_MEMORY,
  DREAM_MIN_CLUSTER_SIZE,
} from "../config.ts";
import { sha256Hex, sql } from "../db.ts";
import { EMBEDDER_MODEL } from "../embedder/index.ts";
import { pickDream, reportFailure, reportSuccess } from "../llm/pick.ts";

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export type DreamResult = {
  candidates: number;
  edges: number;
  components: number;
  clusters_written: number;
  clusters_skipped_size: number;
  clusters_failed: number;
};

type EdgeRow = {
  id: string;
  repo: string | null;
  neighbor_id: string | null;
};

type MemberRow = {
  id: string;
  capture_id: string;
  machine_id: string;
  repo: string | null;
  content: string;
};

/** Run one dream cycle. Per-repo cosine-NN clustering + LLM distillation
 *  into kind='cluster' summaries. Skip-list excludes existing clusters,
 *  pinned, shadowed, superseded, and already-clustered memories. */
export const runDreamOnce = mnemeFn(
  "worker.dream.once",
  async (): Promise<DreamResult> => {
    // ── Phase 1: pull eligible memories + their NN edges in one pass ───
    // LEFT JOIN LATERAL so memories with no neighbours still appear once
    // (with neighbor_id=null) — they become singleton components and get
    // filtered by MIN_CLUSTER_SIZE. The HNSW index handles the actual NN.
    const rows = await sql<EdgeRow[]>`
      WITH candidates AS (
        SELECT id, embedding, repo
        FROM memories
        WHERE archived_at IS NULL
          AND embedding IS NOT NULL
          AND kind <> 'cluster'
          AND private = false
          AND NOT COALESCE((meta->>'pinned')::boolean, false)
          AND (meta->>'shadow_of') IS NULL
          AND (meta->>'superseded_by') IS NULL
          AND (meta->>'in_cluster') IS NULL
      )
      SELECT c.id, c.repo, n.neighbor_id
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

    const nodes = new Set<string>();
    const edges: Array<[string, string]> = [];
    for (const row of rows) {
      nodes.add(row.id);
      if (row.neighbor_id) edges.push([row.id, row.neighbor_id]);
    }

    if (nodes.size === 0) {
      return {
        candidates: 0,
        edges: 0,
        components: 0,
        clusters_written: 0,
        clusters_skipped_size: 0,
        clusters_failed: 0,
      };
    }

    // ── Phase 2: union-find connected components ──────────────────────
    const parent = new Map<string, string>();
    for (const id of nodes) parent.set(id, id);

    const find = (x: string): string => {
      let root = x;
      while (parent.get(root) !== root) root = parent.get(root)!;
      // path compression
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
    for (const [a, b] of edges) union(a, b);

    const components = new Map<string, string[]>();
    for (const id of nodes) {
      const root = find(id);
      const list = components.get(root);
      if (list) list.push(id);
      else components.set(root, [id]);
    }

    // ── Phase 3: filter by size, distil, write ────────────────────────
    let clustersWritten = 0;
    let clustersSkippedSize = 0;
    let clustersFailed = 0;

    for (const memberIds of components.values()) {
      if (
        memberIds.length < DREAM_MIN_CLUSTER_SIZE ||
        memberIds.length > DREAM_MAX_CLUSTER_SIZE
      ) {
        if (memberIds.length >= DREAM_MIN_CLUSTER_SIZE) clustersSkippedSize++;
        continue;
      }

      const members = await sql<MemberRow[]>`
        SELECT id, capture_id, machine_id, repo, content
        FROM memories
        WHERE id = ANY(${memberIds})
        ORDER BY created_at ASC
      `;
      if (members.length < DREAM_MIN_CLUSTER_SIZE) continue;

      // Pick provider per cluster so the breaker can open mid-cycle if a
      // provider starts failing — the rest of the cycle then runs against
      // the other one. Each cluster's prompt-size clip respects whichever
      // provider it ends up calling.
      const { provider, providerName, limits } = pickDream();

      const concatenated = clip(
        members.map((m, i) => `[${i + 1}] ${m.content}`).join("\n\n---\n\n"),
        limits.maxClusterChars,
      );

      let result: { title: string; summary: string };
      try {
        result = await provider.distillCluster(concatenated);
        reportSuccess(providerName);
      } catch (e) {
        reportFailure(providerName);
        clustersFailed++;
        Logger.warn("dream: distill failed", e, {
          provider: providerName,
          members: members.length,
        });
        continue;
      }

      // Cluster row inherits scope from the first (oldest) member. machine_id
      // is provenance only; the cluster is private=false so cross-machine
      // recall sees it. capture_id is NOT NULL on memories so we borrow the
      // first member's — the cluster references that capture as one of its
      // inputs, accurate enough for provenance.
      const seed = members[0]!;
      const contentHash = await sha256Hex(result.summary);
      const chunkId = await sha256Hex(`${contentHash}:${EMBEDDER_MODEL}`);

      try {
        await sql.begin(async (tx) => {
          const clusterRows = await tx<{ id: string }[]>`
            INSERT INTO memories (
              capture_id, chunk_id, content, content_hash,
              embedding_model, tsv,
              kind, importance,
              machine_id, repo, harness, agent, topics, private,
              meta
            )
            VALUES (
              ${seed.capture_id}, ${chunkId}, ${result.summary}, ${contentHash},
              ${EMBEDDER_MODEL}, to_tsvector('english', ${result.summary}),
              'cluster', 0.8,
              ${seed.machine_id}, ${seed.repo}, 'dream', null,
              ${[]}::text[], false,
              ${sql.json({
                cluster_title: result.title,
                member_ids: memberIds,
                distiller_provider: providerName,
                distiller_model: provider.dreamModel,
              } as never)}
            )
            ON CONFLICT (chunk_id) DO NOTHING
            RETURNING id
          `;
          const clusterId = clusterRows[0]?.id;

          // Duplicate summary content (chunk_id collision). The cluster row
          // already exists from a prior cycle; we still need to mark the
          // current members as `in_cluster` so the same component doesn't
          // re-distill on every dream cycle (a deterministic NN graph + idle
          // members = nightly LLM call burning the same content forever).
          //
          // Filter the lookup to `kind = 'cluster' AND archived_at IS NULL`:
          // chunk_id is sha256(content_hash + ":" + EMBEDDER_MODEL), shared by
          // extract and dream, so a summary that happens to match an existing
          // non-cluster memory (or an archived cluster) would otherwise mark
          // members `in_cluster` against the wrong row and permanently
          // suppress real distillation for that component.
          if (!clusterId) {
            const existing = await tx<{ id: string }[]>`
              SELECT id FROM memories
              WHERE chunk_id = ${chunkId}
                AND kind = 'cluster'
                AND archived_at IS NULL
              LIMIT 1
            `;
            const existingId = existing[0]?.id;
            if (existingId) {
              await tx`
                UPDATE memories
                SET meta = meta || jsonb_build_object('in_cluster', ${existingId}::text)
                WHERE id = ANY(${memberIds})
                  AND (meta->>'in_cluster') IS NULL
              `;
            }
            return;
          }

          await tx`
            UPDATE memories
            SET meta = meta || jsonb_build_object('in_cluster', ${clusterId}::text)
            WHERE id = ANY(${memberIds})
          `;

          await tx`
            INSERT INTO ingest_jobs (memory_id, phase, state)
            VALUES (${clusterId}, 'embed', 'queued')
          `;

          clustersWritten++;
          Logger.info("dream: cluster written", {
            id: clusterId,
            provider: providerName,
            title: result.title,
            members: members.length,
            repo: seed.repo ?? "-",
          });
        });
      } catch (e) {
        clustersFailed++;
        Logger.warn("dream: cluster write failed", e);
      }
    }

    const result = {
      candidates: nodes.size,
      edges: edges.length,
      components: components.size,
      clusters_written: clustersWritten,
      clusters_skipped_size: clustersSkippedSize,
      clusters_failed: clustersFailed,
    };
    Logger.info("dream: done", result);
    return result;
  },
);
