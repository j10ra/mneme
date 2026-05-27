// Digest — third worker in the brain trio (nap → dream → digest).
// Cross-cluster consolidator (issue #30).
//
// Where nap maintains and dream synthesises, digest rises above the
// per-cluster view to stitch the global graph: cluster pairs that
// turned out to be the same topic get merged, and contradicting facts
// that span different clusters get reconciled into supersede chains.
//
// Gated by MNEME_DIGEST_ENABLED (default off). The worker is new and
// the operator opts in by flipping the env var and restarting. When
// disabled, register() is skipped entirely so the row never lands in
// _ops.worker_runs and /mneme:status stays clean.
//
// The per-machine daemon dream forms clusters from one 8h window's worth
// of new memories at a time and locks each member to its cluster via
// meta.in_cluster. That works well for stable cluster identity but
// leaves two real correctness gaps:
//   1. Two cycles can form two clusters about the same topic (fresh
//      memories, formed at different times).
//   2. Supersede only fires within a cluster's members + tight cosine
//      neighbours. A newer fact in Cluster B that replaces an older
//      fact in Cluster A is invisible to the daemon — it never sees
//      them together.
//
// This worker runs every 24h, takes a global view of the
// cluster graph, and does two things:
//
//   Operation 1 — Cluster merge.
//     Find pairs of cluster summaries at cosine < DIGEST_MERGE_DISTANCE.
//     Ask Sonnet "are these the same topic?". If yes, merge: keep the
//     higher-importance cluster as canonical, append the loser's
//     member_ids onto the winner's, mark the loser as superseded_by
//     the winner, and re-point all loser members' meta.in_cluster
//     from loser → winner.
//
//     Identity rule: PRESERVE QUALITY SIGNAL. Higher importance wins
//     over older tenure. A fresher cluster that turned out to matter
//     more displaces an established one that didn't.
//
//   Operation 2 — Cross-cluster supersede.
//     Pull memory pairs that span different in_cluster values, are
//     cosine-near, and are age-gapped. Feed batches to Sonnet's
//     existing findSupersedes prompt; validate returned pairs against
//     the candidate set + chronology; write meta.superseded_by.
//
// Conservative refinement (decision baked into #30): we DO NOT
// re-evaluate borderline cluster memberships based on cosine drift.
// The follow-through update of meta.in_cluster during Operation 1
// is the only re-classification we do. Aligns with how sleep
// consolidation works in biology — strengthens existing traces and
// resolves contradictions, doesn't dissolve+reform clusters.
//
// Idempotency: every write is a no-op if the target value is already
// what we'd write (filters on superseded_by IS NULL, in_cluster
// rewrites are a deterministic function of the merge graph). Re-
// running the cycle on the same data produces no additional changes.

import { Logger, mnemeFn } from "@mneme/core";
import {
  DIGEST_MAX_MERGE_PAIRS,
  DIGEST_MAX_SUPERSEDE_CANDIDATES,
  DIGEST_MERGE_DISTANCE,
  DIGEST_MERGE_WINDOW,
  SUPERSEDE_LLM_ADJACENT_COSINE_MAX,
  SUPERSEDE_LLM_BATCH_MAX_MEMBERS,
} from "../infra/config.ts";
import { sql } from "../infra/db.ts";
import { validateSupersedePairs } from "../lib/supersede.ts";
import { pickDigest } from "../llm/pick.ts";
import type { Kind, SupersedeCandidate, SupersedePair } from "../llm/types.ts";

export type DigestResult = {
  merge_pairs_evaluated: number;
  merges_applied: number;
  supersede_batches: number;
  supersedes_applied: number;
  supersedes_rejected: number;
};

type MergePairRow = { a_id: string; b_id: string };

type ClusterRow = {
  id: string;
  title: string;
  summary: string;
  importance: number;
  member_ids: string[];
};

/** The merge round-robin window: the DIGEST_MERGE_WINDOW
 *  least-recently-digested non-superseded clusters. No embedding filter
 *  -- a null-embedding cluster simply yields no merge pairs and is still
 *  stamped, which is correct. */
export async function selectDigestClusterWindow(limit: number): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    SELECT id::text AS id
    FROM memories
    WHERE kind = 'cluster'
      AND archived_at IS NULL
      AND (meta->>'superseded_by') IS NULL
    ORDER BY meta->>'last_digested_at' NULLS FIRST, created_at ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}

/** Collapse mirrored pairs: when both clusters of an unordered pair are
 *  in the window, the scan returns both (A,B) and (B,A). Keyed on the
 *  sorted id pair, first occurrence wins. Pure -- unit-tested directly. */
export function dedupePairs(rows: MergePairRow[]): MergePairRow[] {
  const seen = new Set<string>();
  const deduped: MergePairRow[] = [];
  for (const r of rows) {
    const key = [r.a_id, r.b_id].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }
  return deduped;
}

/** Merge-pair candidates: cluster pairs at cosine < DIGEST_MERGE_DISTANCE
 *  where side `a` is in this cycle's round-robin window. Side `b` is any
 *  non-superseded cluster with a non-null embedding, so a stale-window
 *  cluster still pairs with a fresh one. Unordered pairs are
 *  de-duplicated in TS because the windowed scan cannot use the old
 *  `b.id > a.id` trick. DIGEST_MAX_MERGE_PAIRS caps the SQL result
 *  pre-dedup, so the deduped count can be lower. */
export async function findMergePairs(windowIds: string[]): Promise<MergePairRow[]> {
  if (windowIds.length === 0) return [];
  const rows = (await sql<MergePairRow[]>`
    SELECT a.id::text AS a_id, b.id::text AS b_id
    FROM memories a
    JOIN memories b
      ON b.id <> a.id
        AND b.kind = 'cluster' AND b.archived_at IS NULL
        AND b.embedding IS NOT NULL
        AND b.repo IS NOT DISTINCT FROM a.repo
        AND (b.meta->>'superseded_by') IS NULL
        AND a.embedding <=> b.embedding < ${DIGEST_MERGE_DISTANCE}
    WHERE a.id = ANY(${windowIds})
      AND a.embedding IS NOT NULL
    ORDER BY a.embedding <=> b.embedding ASC
    LIMIT ${DIGEST_MAX_MERGE_PAIRS}
  `) as MergePairRow[];

  return dedupePairs(rows);
}

/** Load a cluster row by id. Returns null if the cluster does not exist,
 *  is archived, or has already been superseded.
 *
 *  The superseded guard is critical for merge-loop correctness: within one
 *  digest cycle, a cluster can be marked superseded by an earlier merge.
 *  Without this filter, that dead cluster could still be loaded and chosen
 *  as a merge winner, stranding the loser's members on a dead cluster.
 *  The merge loop's existing `if (!a || !b) continue` then skips the pair
 *  cleanly, and the still-valid merge is re-evaluated in the next cycle. */
export async function loadCluster(id: string): Promise<ClusterRow | null> {
  const rows = (await sql<ClusterRow[]>`
    SELECT
      id::text AS id,
      COALESCE(meta->>'cluster_title', '') AS title,
      content AS summary,
      importance::real AS importance,
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(meta->'member_ids')),
        ARRAY[]::text[]
      ) AS member_ids
    FROM memories
    WHERE id = ${id} AND kind = 'cluster' AND archived_at IS NULL
      AND (meta->>'superseded_by') IS NULL
    LIMIT 1
  `) as ClusterRow[];
  return rows[0] ?? null;
}

async function applyMerge(winner: ClusterRow, loser: ClusterRow): Promise<void> {
  // Union member_ids on the winner. Mark loser superseded by winner.
  // Re-point every memory whose in_cluster was the loser to the winner.
  const merged = Array.from(new Set([...winner.member_ids, ...loser.member_ids]));
  await sql.begin(async (tx) => {
    await tx`
      UPDATE memories
      SET meta = jsonb_set(meta, '{member_ids}', ${sql.json(merged) as never})
      WHERE id = ${winner.id}
    `;
    await tx`
      UPDATE memories
      SET meta = (meta - 'in_cluster') || jsonb_build_object('superseded_by', ${winner.id}::text)
      WHERE id = ${loser.id}
        AND (meta->>'superseded_by') IS NULL
    `;
    await tx`
      UPDATE memories
      SET meta = meta || jsonb_build_object('in_cluster', ${winner.id}::text)
      WHERE (meta->>'in_cluster') = ${loser.id}
    `;
  });
}

type CrossClusterCandidateRow = {
  id: string;
  kind: Kind;
  content: string;
  created_at: Date;
  // Unread by callers; present only because SELECT DISTINCT requires
  // every ORDER BY expression to appear in the select list.
  last_digested_at: string | null;
};

export async function findCrossClusterSupersedeCandidates(): Promise<CrossClusterCandidateRow[]> {
  // Pull memories that have at least one cosine-near neighbour in a
  // DIFFERENT cluster. Returns the union of both sides — the LLM scans
  // the batch for actual supersede pairs (existing prompt expects a
  // flat candidate list, not pre-paired tuples). Caller validates each
  // returned pair against the candidate set + chronology.
  return (await sql<CrossClusterCandidateRow[]>`
    SELECT DISTINCT
      a.id::text AS id,
      a.kind::text AS kind,
      a.content,
      a.created_at,
      a.meta->>'last_digested_at' AS last_digested_at
    FROM memories a
    JOIN memories b
      ON b.archived_at IS NULL
        AND b.embedding IS NOT NULL
        AND b.kind <> 'cluster'
        AND b.repo IS NOT DISTINCT FROM a.repo
        AND (b.meta->>'in_cluster') IS NOT NULL
        AND (a.meta->>'in_cluster') <> (b.meta->>'in_cluster')
        AND (b.meta->>'superseded_by') IS NULL
        AND NOT COALESCE((b.meta->>'pinned')::boolean, false)
        AND a.embedding <=> b.embedding < ${SUPERSEDE_LLM_ADJACENT_COSINE_MAX}
    WHERE a.archived_at IS NULL
      AND a.embedding IS NOT NULL
      AND a.kind <> 'cluster'
      AND (a.meta->>'in_cluster') IS NOT NULL
      AND (a.meta->>'superseded_by') IS NULL
      AND NOT COALESCE((a.meta->>'pinned')::boolean, false)
    ORDER BY a.meta->>'last_digested_at' NULLS FIRST, a.created_at ASC
    LIMIT ${DIGEST_MAX_SUPERSEDE_CANDIDATES}
  `) as CrossClusterCandidateRow[];
}

async function applySupersede(oldId: string, newId: string): Promise<boolean> {
  const r = await sql`
    UPDATE memories
    SET meta = (meta - 'in_cluster') || jsonb_build_object('superseded_by', ${newId}::text)
    WHERE id = ${oldId}
      AND (meta->>'superseded_by') IS NULL
  `;
  return r.count > 0;
}

/** Stamp meta.last_digested_at = now() on the given ids. Used for both
 *  digest operations -- Op1 stamps cluster rows, Op2 stamps member rows
 *  -- so each cycle's round-robin advances past the rows it considered. */
export async function stampDigested(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await sql`
    UPDATE memories
    SET meta = jsonb_set(COALESCE(meta, '{}'::jsonb),
                         '{last_digested_at}', to_jsonb(now()::text))
    WHERE id = ANY(${ids})
  `;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export const runDigestOnce = mnemeFn("worker.digest.once", async (): Promise<DigestResult> => {
  const cycleStart = Date.now();
  Logger.info("digest: cycle start");

  const dr = pickDigest();
  if (!dr.judgeClusterMerge || !dr.findSupersedes) {
    Logger.info("digest: skipped (provider lacks judgeClusterMerge or findSupersedes)", {
      provider: dr.name,
    });
    return {
      merge_pairs_evaluated: 0,
      merges_applied: 0,
      supersede_batches: 0,
      supersedes_applied: 0,
      supersedes_rejected: 0,
    };
  }
  const judgeClusterMerge = dr.judgeClusterMerge;
  const findSupersedes = dr.findSupersedes;

  // ─── Operation 1: cluster merge ─────────────────────────────────
  Logger.info("digest: Op1 cluster merge — selecting window");
  let opStart = Date.now();
  const mergeWindow = await selectDigestClusterWindow(DIGEST_MERGE_WINDOW);
  Logger.info("digest: Op1 window selected", { clusters: mergeWindow.length });
  const mergePairs = await findMergePairs(mergeWindow);
  Logger.info("digest: Op1 candidate pairs", { pairs: mergePairs.length });
  let mergesApplied = 0;
  for (const pair of mergePairs) {
    const a = await loadCluster(pair.a_id);
    const b = await loadCluster(pair.b_id);
    if (!a || !b) continue;

    let judgment: Awaited<ReturnType<typeof judgeClusterMerge>>;
    try {
      judgment = await judgeClusterMerge(
        { title: a.title, summary: a.summary },
        { title: b.title, summary: b.summary },
      );
    } catch (e) {
      Logger.warn("digest: merge judgment failed", e, {
        a_id: a.id,
        b_id: b.id,
      });
      continue;
    }

    if (!judgment.same_topic) {
      Logger.debug("digest: keep_separate", {
        a_id: a.id,
        b_id: b.id,
        reason: judgment.reason,
      });
      continue;
    }

    // Preserve quality signal. Higher importance wins; tie goes to
    // the older cluster id (lexically smaller UUID is the older row
    // here because gen_random_uuid is monotonic-ish under load —
    // but a strict tiebreak by created_at would need an extra
    // SELECT, and importance ties at the same imp value are rare
    // enough that lexical id is acceptable noise).
    const winner = a.importance >= b.importance ? a : b;
    const loser = winner === a ? b : a;
    try {
      await applyMerge(winner, loser);
      mergesApplied++;
      Logger.info("digest: clusters merged", {
        winner: winner.id,
        loser: loser.id,
        winner_imp: winner.importance,
        loser_imp: loser.importance,
        reason: judgment.reason,
      });
    } catch (e) {
      Logger.warn("digest: merge apply failed", e, {
        winner: winner.id,
        loser: loser.id,
      });
    }
  }

  // Stamp every cluster in this cycle's window, merged or not, so the
  // next cycle advances to the next-stalest clusters.
  await stampDigested(mergeWindow);
  Logger.info("digest: Op1 done", { merges_applied: mergesApplied, ms: Date.now() - opStart });

  // ─── Operation 2: cross-cluster supersede ──────────────────────
  Logger.info("digest: Op2 cross-cluster supersede — selecting candidates");
  opStart = Date.now();
  const candidates = await findCrossClusterSupersedeCandidates();
  Logger.info("digest: Op2 candidates", { count: candidates.length });
  let supersedesApplied = 0;
  let supersedesRejected = 0;
  let batchCount = 0;
  for (const batch of chunk(candidates, SUPERSEDE_LLM_BATCH_MAX_MEMBERS)) {
    batchCount++;
    const supersedeBatch: SupersedeCandidate[] = batch.map((row) => ({
      id: row.id,
      kind: row.kind,
      content: row.content,
      created_at: row.created_at.toISOString(),
    }));
    let pairs: SupersedePair[];
    try {
      pairs = await findSupersedes(supersedeBatch);
    } catch (e) {
      Logger.warn("digest: supersede call failed", e, {
        batch: batchCount,
      });
      continue;
    }

    // Structural validation via the shared validator (same contract the
    // server applies to dream's pairs in writeClusters). The candidate set
    // is the batch we sent the LLM; created_at on each is the DB value.
    const { valid, rejected } = validateSupersedePairs(pairs, supersedeBatch);
    for (const r of rejected) {
      Logger.warn("digest: supersede pair rejected", undefined, {
        reason: r.reason,
        old_id: r.pair.old_id,
        new_id: r.pair.new_id,
      });
      supersedesRejected++;
    }
    for (const pair of valid) {
      const written = await applySupersede(pair.old_id, pair.new_id);
      if (written) {
        supersedesApplied++;
        Logger.info("digest: cross-cluster supersede written", {
          old_id: pair.old_id,
          new_id: pair.new_id,
          reason: pair.reason,
        });
      }
    }
  }

  // Stamp every candidate considered this cycle so the next cycle's
  // watermark-ordered scan advances to the next-stalest member rows.
  await stampDigested(candidates.map((c) => c.id));
  Logger.info("digest: Op2 done", {
    batches: batchCount,
    supersedes_applied: supersedesApplied,
    rejected: supersedesRejected,
    ms: Date.now() - opStart,
  });

  const result: DigestResult = {
    merge_pairs_evaluated: mergePairs.length,
    merges_applied: mergesApplied,
    supersede_batches: batchCount,
    supersedes_applied: supersedesApplied,
    supersedes_rejected: supersedesRejected,
  };
  Logger.info("digest: done", { ...result, total_ms: Date.now() - cycleStart });
  return result;
});
