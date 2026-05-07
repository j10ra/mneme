import { Logger, mnemeFn } from "@mneme/core";
import {
  DREAM_CLUSTER_DISTANCE,
  DREAM_MAX_CLUSTER_SIZE,
  DREAM_MAX_NEIGHBORS_PER_MEMORY,
  DREAM_MIN_CLUSTER_SIZE,
  SUPERSEDE_LLM_ADJACENT_AGE_WINDOW,
  SUPERSEDE_LLM_ADJACENT_COSINE_MAX,
  SUPERSEDE_LLM_BATCH_MAX_MEMBERS,
} from "../config.ts";
import { sha256Hex, sql } from "../db.ts";
import { EMBEDDER_MODEL } from "../embedder/index.ts";
import { pickDream } from "../llm/pick.ts";
import type { Kind, SupersedeCandidate } from "../llm/types.ts";

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
  supersedes_marked: number;
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
  kind: Kind;
  created_at: Date;
};

type AdjacentRow = {
  id: string;
  content: string;
  kind: Kind;
  created_at: Date;
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
        supersedes_marked: 0,
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
    let supersedesMarked = 0;

    for (const memberIds of components.values()) {
      if (
        memberIds.length < DREAM_MIN_CLUSTER_SIZE ||
        memberIds.length > DREAM_MAX_CLUSTER_SIZE
      ) {
        if (memberIds.length >= DREAM_MIN_CLUSTER_SIZE) clustersSkippedSize++;
        continue;
      }

      const members = await sql<MemberRow[]>`
        SELECT id, capture_id, machine_id, repo, content, kind, created_at
        FROM memories
        WHERE id = ANY(${memberIds})
        ORDER BY created_at ASC
      `;
      if (members.length < DREAM_MIN_CLUSTER_SIZE) continue;

      // Pick provider per cluster so the breaker can open mid-cycle if a
      // provider starts failing — the rest of the cycle then runs against
      // the other one. Each cluster's prompt-size clip respects whichever
      // provider it ends up calling. The instance wraps the provider's
      // methods so success/failure auto-feeds the per-provider breaker.
      const dr = pickDream();

      const concatenated = clip(
        members.map((m, i) => `[${i + 1}] ${m.content}`).join("\n\n---\n\n"),
        dr.limits.maxClusterChars,
      );

      let result: { title: string; summary: string };
      try {
        result = await dr.distillCluster(concatenated);
      } catch (e) {
        clustersFailed++;
        Logger.warn("dream: distill failed", e, {
          provider: dr.name,
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
                distiller_provider: dr.name,
                distiller_model: dr.model,
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
            provider: dr.name,
            title: result.title,
            members: members.length,
            repo: seed.repo ?? "-",
          });
        });
      } catch (e) {
        clustersFailed++;
        Logger.warn("dream: cluster write failed", e);
      }

      // ── Phase 4: supersede pass (cloud-only) ───────────────────────
      // Skip on local — declaring memories obsolete is too consequential
      // for the 7B/3B path. The trust policy lives in the type:
      // `findSupersedes` is optional and only exported by providers we
      // trust to make this judgement (today: openrouter only). Local
      // omits the method entirely, so this check both gates the policy
      // and narrows the type for the call below.
      if (!dr.findSupersedes) continue;
      const findSupersedes = dr.findSupersedes;

      // Pull adjacent neighbors (cosine < 0.15, last 60d, not pinned, not
      // already superseded, not in this cluster). Caps per-member at 5;
      // total candidates capped at SUPERSEDE_LLM_BATCH_MAX_MEMBERS once
      // members + adjacents are concatenated.
      const adjacent = await sql<AdjacentRow[]>`
        WITH seeds AS (
          SELECT id, embedding, repo
          FROM memories
          WHERE id = ANY(${memberIds})
            AND embedding IS NOT NULL
        )
        SELECT DISTINCT ON (n.id) n.id, n.content, n.kind, n.created_at
        FROM seeds s
        CROSS JOIN LATERAL (
          SELECT m.id, m.content, m.kind, m.created_at
          FROM memories m
          WHERE m.archived_at IS NULL
            AND m.embedding IS NOT NULL
            AND m.id <> ALL(${memberIds})
            AND m.kind <> 'cluster'
            AND m.repo IS NOT DISTINCT FROM s.repo
            AND m.created_at > now() - ${SUPERSEDE_LLM_ADJACENT_AGE_WINDOW}::interval
            AND NOT COALESCE((m.meta->>'pinned')::boolean, false)
            AND (m.meta->>'superseded_by') IS NULL
            AND m.embedding <=> s.embedding < ${SUPERSEDE_LLM_ADJACENT_COSINE_MAX}
          ORDER BY m.embedding <=> s.embedding ASC
          LIMIT 5
        ) n ON true
        ORDER BY n.id, n.created_at DESC
      `;

      const candidates: SupersedeCandidate[] = [
        ...members.map((m) => ({
          id: m.id,
          kind: m.kind,
          content: m.content,
          created_at: m.created_at.toISOString(),
        })),
        ...adjacent.map((a) => ({
          id: a.id,
          kind: a.kind,
          content: a.content,
          created_at: a.created_at.toISOString(),
        })),
      ].slice(0, SUPERSEDE_LLM_BATCH_MAX_MEMBERS);

      const candidateById = new Map(candidates.map((c) => [c.id, c]));

      let pairs: Awaited<ReturnType<typeof findSupersedes>>;
      try {
        pairs = await findSupersedes(candidates);
      } catch (e) {
        Logger.warn("dream: supersede call failed", e, {
          provider: dr.name,
          candidates: candidates.length,
        });
        continue;
      }

      for (const pair of pairs) {
        // Validate: both ids must be in the candidate set.
        const oldMem = candidateById.get(pair.old_id);
        const newMem = candidateById.get(pair.new_id);
        if (!oldMem || !newMem) {
          Logger.warn("dream: supersede pair invalid (id not in candidates)", {
            pair,
          });
          continue;
        }
        // Validate: chronology — old must actually be older than new.
        if (
          new Date(oldMem.created_at).getTime() >=
          new Date(newMem.created_at).getTime()
        ) {
          Logger.warn("dream: supersede pair invalid (chronology)", { pair });
          continue;
        }
        const written = await sql`
          UPDATE memories
          SET meta = meta || jsonb_build_object('superseded_by', ${pair.new_id}::text)
          WHERE id = ${pair.old_id}
            AND (meta->>'superseded_by') IS NULL
        `;
        if (written.count > 0) {
          supersedesMarked++;
          Logger.info("dream: supersede written", {
            old_id: pair.old_id,
            new_id: pair.new_id,
            reason: pair.reason,
          });
        }
      }
    }

    const result = {
      candidates: nodes.size,
      edges: edges.length,
      components: components.size,
      clusters_written: clustersWritten,
      clusters_skipped_size: clustersSkippedSize,
      clusters_failed: clustersFailed,
      supersedes_marked: supersedesMarked,
    };
    Logger.info("dream: done", result);
    return result;
  },
);
