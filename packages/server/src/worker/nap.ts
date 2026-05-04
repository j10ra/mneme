import { Logger, mnemeFn } from "@mneme/core";
import { sql } from "../db.ts";

// Per-cycle multiplicative decay for non-pinned memories. With τ=30 days and
// 4 naps/day = 120 naps over the time constant, factor = exp(-1/120) ≈ 0.9917.
// After 30 days a memory's importance lands at original × 1/e (~37%).
const PER_NAP_DECAY = Math.exp(-1 / 120);

// Importance floors. Pinned memories decay like any other memory but stop at
// PIN_FLOOR — high enough to keep them surfacing, low enough that fresh pins
// naturally outrank stale ones. Unpinned memories decay all the way to
// FLOOR. The asymmetric floor is what gives "pin" its meaning: pinned
// content stays in recall's high zone forever; unpinned content fades.
const FLOOR = 0.05;
const PIN_FLOOR = 0.5;

// Hard reduction applied to memories shadowed in this cycle (exact-text dups).
const SHADOW_DECAY = 0.1;

// Transient error patterns. These match upstream-flake messages worth retrying
// after a grace window. Anything not matching is treated as content-related
// and retired to state='dead'. Uses POSIX regex (~*), so [0-9] not \d.
const TRANSIENT_REGEX =
  "HTTP 5[0-9][0-9]|timed out|timeout|ECONNRESET|tunnel|gateway|connection (refused|reset|closed|aborted)";

// Semantic relations: cosine distance threshold for "near enough to be related"
// and max neighbors recorded per memory. 0.15 is empirically tight (real
// relatedness, not just topical adjacency); 5 caps the meta.related_to growth.
const RELATE_DISTANCE = 0.15;
const RELATE_MAX_NEIGHBORS = 5;

export type NapResult = {
  decayed: number;
  shadowed: number;
  related: number;
  resurrected: number;
  killed: number;
};

/** Run one nap cycle: decay importance with asymmetric floors, mark exact-
 *  text shadows, link semantic neighbours via meta.related_to, resurrect
 *  transient ingest failures, retire non-transient errors to dead. All five
 *  steps run in one transaction — the whole pass is small (~1-2s on current
 *  data) and atomic state is easier to reason about. */
export const runNapOnce = mnemeFn(
  "worker.nap.once",
  async (): Promise<NapResult> => {
    const result = await sql.begin(async (tx) => {
      // 1. Decay all non-archived memories. Pinned rows stop at PIN_FLOOR;
      //    unpinned stop at FLOOR. Skip rows already at their respective
      //    floor so we don't waste writes on no-op updates.
      const decayed = await tx`
        UPDATE memories
        SET importance = GREATEST(
          CASE WHEN COALESCE((meta->>'pinned')::boolean, false)
               THEN ${PIN_FLOOR}::real
               ELSE ${FLOOR}::real
          END,
          importance * ${PER_NAP_DECAY}::real
        )
        WHERE archived_at IS NULL
          AND importance > CASE
            WHEN COALESCE((meta->>'pinned')::boolean, false) THEN ${PIN_FLOOR}::real
            ELSE ${FLOOR}::real
          END
      `;

      // 2. Exact-text shadows: in each content_hash group, keep the highest-
      //    importance row; mark the rest as meta.shadow_of=<keeper>, importance×0.1.
      const shadowed = await tx`
        WITH groups AS (
          SELECT content_hash,
                 (array_agg(id ORDER BY importance DESC, created_at DESC))[1] AS keeper_id
          FROM memories
          WHERE archived_at IS NULL
            AND (meta->>'shadow_of') IS NULL
          GROUP BY content_hash
          HAVING count(*) > 1
        )
        UPDATE memories m
        SET importance = m.importance * ${SHADOW_DECAY}::real,
            meta = m.meta || jsonb_build_object('shadow_of', g.keeper_id::text)
        FROM groups g
        WHERE m.content_hash = g.content_hash
          AND m.id <> g.keeper_id
          AND (m.meta->>'shadow_of') IS NULL
      `;

      // 3. Semantic relations: for memories that are recent OR never-processed,
      //    find ≤RELATE_MAX_NEIGHBORS same-repo nearest neighbors at cosine
      //    distance < RELATE_DISTANCE, then mutually append their ids to
      //    meta.related_to. The HNSW index on memories.embedding makes the
      //    LATERAL JOIN cheap. Mutual update means an old memory gets new
      //    relations even if it wasn't in the seed set itself.
      const related = await tx`
        WITH seeds AS (
          SELECT id, embedding, repo
          FROM memories
          WHERE archived_at IS NULL
            AND embedding IS NOT NULL
            AND (
              created_at > now() - interval '7 days'
              OR (meta->'related_to') IS NULL
              OR jsonb_array_length(meta->'related_to') = 0
            )
        ),
        neighbors AS (
          SELECT s.id AS a_id, n.id AS b_id
          FROM seeds s,
          LATERAL (
            SELECT m.id
            FROM memories m
            WHERE m.archived_at IS NULL
              AND m.embedding IS NOT NULL
              AND m.repo IS NOT DISTINCT FROM s.repo
              AND m.id <> s.id
              AND s.embedding <=> m.embedding < ${RELATE_DISTANCE}
            ORDER BY s.embedding <=> m.embedding
            LIMIT ${RELATE_MAX_NEIGHBORS}
          ) n
        ),
        mutual AS (
          SELECT a_id, b_id FROM neighbors
          UNION
          SELECT b_id, a_id FROM neighbors
        ),
        grouped AS (
          SELECT a_id, array_agg(DISTINCT b_id::text) AS new_related
          FROM mutual
          GROUP BY a_id
        )
        UPDATE memories m
        SET meta = jsonb_set(
          m.meta,
          '{related_to}',
          (
            SELECT to_jsonb(array_agg(DISTINCT v))
            FROM (
              SELECT jsonb_array_elements_text(COALESCE(m.meta->'related_to', '[]'::jsonb)) AS v
              UNION
              SELECT unnest(g.new_related) AS v
            ) all_v
          )
        )
        FROM grouped g
        WHERE m.id = g.a_id
          AND m.archived_at IS NULL
      `;

      // 4. Resurrect transient ingest failures (1h grace).
      const resurrected = await tx`
        UPDATE ingest_jobs
        SET state = 'queued',
            attempts = 0,
            scheduled_at = now(),
            error = NULL,
            started_at = NULL,
            finished_at = NULL
        WHERE state = 'error'
          AND attempts >= 5
          AND finished_at < now() - interval '1 hour'
          AND error ~* ${TRANSIENT_REGEX}
      `;

      // 5. Retire non-transient errors to dead (24h grace).
      const killed = await tx`
        UPDATE ingest_jobs
        SET state = 'dead'
        WHERE state = 'error'
          AND attempts >= 5
          AND finished_at < now() - interval '24 hours'
          AND NOT (error ~* ${TRANSIENT_REGEX})
      `;

      return {
        decayed: decayed.count,
        shadowed: shadowed.count,
        related: related.count,
        resurrected: resurrected.count,
        killed: killed.count,
      };
    });
    Logger.info(
      `nap: decayed=${result.decayed}, shadowed=${result.shadowed}, related=${result.related}, resurrected=${result.resurrected}, killed=${result.killed}`,
    );
    return result;
  },
);
