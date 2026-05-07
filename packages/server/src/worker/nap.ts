import { Logger, mnemeFn } from "@mneme/core";
import {
  NAP_DECAY_PER_CYCLE,
  NAP_FLOOR,
  NAP_PIN_FLOOR,
  NAP_RELATE_DISTANCE,
  NAP_RELATE_MAX_NEIGHBORS,
  NAP_SHADOW_DECAY,
  SUPERSEDE_RULE_AGE_GAP,
  SUPERSEDE_RULE_COSINE_MAX,
  SUPERSEDE_RULE_KEYWORDS,
  SUPERSEDE_RULE_PER_CYCLE_CAP,
} from "../infra/config.ts";
import { sql } from "../infra/db.ts";

// Transient error patterns. These match upstream-flake messages worth retrying
// after a grace window. Anything not matching is treated as content-related
// and retired to state='dead'. Uses POSIX regex (~*), so [0-9] not \d.
// Covers: 5xx server errors, 408 / 429 rate-limit, generic timeouts, the
// Node socket errno strings that pop out of fetch() (ECONNRESET / REFUSED,
// ENOTFOUND, EAI_AGAIN), and the common "socket hang up" string.
const TRANSIENT_REGEX =
  "HTTP (4(29|08)|5[0-9][0-9])|status (4(29|08)|5[0-9][0-9])|rate.?limit|timed out|timeout|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up|tunnel|gateway|connection (refused|reset|closed|aborted)";

export type NapResult = {
  decayed: number;
  shadowed: number;
  related: number;
  superseded: number;
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
               THEN ${NAP_PIN_FLOOR}::real
               ELSE ${NAP_FLOOR}::real
          END,
          importance * ${NAP_DECAY_PER_CYCLE}::real
        )
        WHERE archived_at IS NULL
          AND importance > CASE
            WHEN COALESCE((meta->>'pinned')::boolean, false) THEN ${NAP_PIN_FLOOR}::real
            ELSE ${NAP_FLOOR}::real
          END
      `;

      // 2. Exact-text shadows: in each (content_hash, repo, scope) group,
      //    keep the highest-importance row; mark the rest as
      //    meta.shadow_of=<keeper>, importance×0.1. Scope is `public` for
      //    private=false rows (so identical public content from machines A
      //    and B in the same repo coalesces) and the machine_id for private
      //    rows (so private content from machine A never shadows machine B's
      //    private copy of the same string). Repo is part of the key so the
      //    same observation made in two unrelated repos isn't collapsed.
      const shadowed = await tx`
        WITH groups AS (
          SELECT content_hash,
                 COALESCE(repo, '__null__') AS repo_key,
                 CASE WHEN private THEN machine_id ELSE 'public' END AS scope_key,
                 (array_agg(id ORDER BY importance DESC, created_at DESC))[1] AS keeper_id
          FROM memories
          WHERE archived_at IS NULL
            AND (meta->>'shadow_of') IS NULL
          GROUP BY content_hash, COALESCE(repo, '__null__'),
                   CASE WHEN private THEN machine_id ELSE 'public' END
          HAVING count(*) > 1
        )
        UPDATE memories m
        SET importance = m.importance * ${NAP_SHADOW_DECAY}::real,
            meta = m.meta || jsonb_build_object('shadow_of', g.keeper_id::text)
        FROM groups g
        WHERE m.content_hash = g.content_hash
          AND COALESCE(m.repo, '__null__') = g.repo_key
          AND CASE WHEN m.private THEN m.machine_id ELSE 'public' END = g.scope_key
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
              AND s.embedding <=> m.embedding < ${NAP_RELATE_DISTANCE}
            ORDER BY s.embedding <=> m.embedding
            LIMIT ${NAP_RELATE_MAX_NEIGHBORS}
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

      // 4. Rule-based supersede pass (conservative). For each non-pinned,
      //    non-superseded older memory with an embedding, find the closest
      //    same-repo memory created at least SUPERSEDE_RULE_AGE_GAP later
      //    whose content contains one of SUPERSEDE_RULE_KEYWORDS (case-
      //    insensitive). The cosine ceiling (0.05) is intentionally tight —
      //    we want near-rephrasings, not topical adjacency. The keyword
      //    filter is what disambiguates "newer rephrasing" from "newer fact
      //    that happens to be near in embedding space" (the LLM pass in
      //    dream catches the latter). Per-cycle cap bounds blast radius
      //    if the keyword list ever bloomes in the corpus.
      const supersededRows = await tx<{ older_id: string; newer_id: string }[]>`
        WITH pairs AS (
          SELECT o.id AS older_id, n.newer_id
          FROM memories o
          CROSS JOIN LATERAL (
            SELECT m.id AS newer_id
            FROM memories m
            WHERE m.archived_at IS NULL
              AND m.embedding IS NOT NULL
              AND m.repo IS NOT DISTINCT FROM o.repo
              AND m.id <> o.id
              AND NOT COALESCE((m.meta->>'pinned')::boolean, false)
              AND (m.meta->>'superseded_by') IS NULL
              AND m.created_at > o.created_at + ${SUPERSEDE_RULE_AGE_GAP}::interval
              AND m.content ILIKE ANY(${SUPERSEDE_RULE_KEYWORDS.map((k) => `%${k}%`)})
              AND m.embedding <=> o.embedding < ${SUPERSEDE_RULE_COSINE_MAX}
            ORDER BY m.embedding <=> o.embedding ASC
            LIMIT 1
          ) n
          WHERE o.archived_at IS NULL
            AND o.embedding IS NOT NULL
            AND NOT COALESCE((o.meta->>'pinned')::boolean, false)
            AND (o.meta->>'superseded_by') IS NULL
          LIMIT ${SUPERSEDE_RULE_PER_CYCLE_CAP}
        )
        UPDATE memories m
        SET meta = m.meta || jsonb_build_object('superseded_by', p.newer_id::text)
        FROM pairs p
        WHERE m.id = p.older_id
        RETURNING p.older_id::text, p.newer_id::text
      `;

      // 5. Resurrect transient ingest failures (1h grace).
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

      // 6. Retire non-transient errors to dead (24h grace).
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
        superseded: supersededRows.length,
        resurrected: resurrected.count,
        killed: killed.count,
      };
    });
    Logger.info("nap: done", result);
    return result;
  },
);
