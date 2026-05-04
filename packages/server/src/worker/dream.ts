import { Logger, mnemeFn } from "@mneme/core";
import { sha256Hex, sql } from "../db.ts";
import { EMBEDDER_MODEL } from "../embedder/index.ts";
import { distillCluster } from "../llm/index.ts";

// Tighter than nap's 0.15: cluster members must be genuinely about the same
// thing, not just topically adjacent.
const CLUSTER_DISTANCE = 0.10;

// Components below MIN_CLUSTER_SIZE are pair-noise; above MAX_CLUSTER_SIZE
// blow the LLM context budget. v1 just skips out-of-range components — a
// later refinement could recursively split too-large ones.
const MIN_CLUSTER_SIZE = 3;
const MAX_CLUSTER_SIZE = 20;

// Per-memory NN cap inside the LATERAL JOIN. Without it a hub memory in a
// dense cluster would emit 100+ edges and slow union-find for no benefit.
const MAX_NEIGHBORS_PER_MEMORY = 20;

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
          AND c.embedding <=> m.embedding < ${CLUSTER_DISTANCE}
        ORDER BY c.embedding <=> m.embedding
        LIMIT ${MAX_NEIGHBORS_PER_MEMORY}
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
      if (memberIds.length < MIN_CLUSTER_SIZE || memberIds.length > MAX_CLUSTER_SIZE) {
        if (memberIds.length >= MIN_CLUSTER_SIZE) clustersSkippedSize++;
        continue;
      }

      const members = await sql<MemberRow[]>`
        SELECT id, capture_id, machine_id, repo, content
        FROM memories
        WHERE id = ANY(${memberIds})
        ORDER BY created_at ASC
      `;
      if (members.length < MIN_CLUSTER_SIZE) continue;

      const concatenated = members
        .map((m, i) => `[${i + 1}] ${m.content}`)
        .join("\n\n---\n\n");

      let result: { title: string; summary: string };
      try {
        result = await distillCluster(concatenated);
      } catch (e) {
        clustersFailed++;
        Logger.warn(`dream: distill failed for cluster of ${members.length}`, e);
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
              ${sql.json({ cluster_title: result.title, member_ids: memberIds } as never)}
            )
            ON CONFLICT (chunk_id) DO NOTHING
            RETURNING id
          `;
          const clusterId = clusterRows[0]?.id;
          if (!clusterId) return; // duplicate summary content; skip member-marking too

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
          Logger.info(
            `dream: cluster id=${clusterId} title="${result.title}" members=${members.length} repo=${seed.repo ?? "-"}`,
          );
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
    Logger.info(
      `dream: candidates=${result.candidates}, edges=${result.edges}, components=${result.components}, written=${result.clusters_written}, skipped_size=${result.clusters_skipped_size}, failed=${result.clusters_failed}`,
    );
    return result;
  },
);
