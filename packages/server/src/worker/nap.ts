import { Logger, mnemeFn } from "@mneme/core";
import {
  NAP_DECAY_PER_CYCLE,
  NAP_FLOOR,
  NAP_PER_CYCLE_CAP,
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

export type NapResult = {
  decayed: number;
  shadowed: number;
  related: number;
  superseded: number;
};

/** Run one nap cycle, all in one transaction:
 *    1. decay importance with asymmetric pinned/unpinned floors
 *    2. mark exact-text shadows in (content_hash, repo, scope) groups
 *    3. pick the cycle's seed set (least-recently-napped, capped)
 *    4. relate-pass: link semantic neighbours via meta.related_to
 *    5. supersede-rule pass: rule-based newer-replaces-older
 *    6. stamp meta.last_napped_at on every seed (round-robin gate)
 *  Steps 4 + 5 are bounded by the seed cap so the whole transaction
 *  stays under Railway's 2-min Postgres statement_timeout regardless
 *  of corpus size.
 *
 *  The legacy ingest_jobs resurrect/retire passes were retired with the
 *  ingest_jobs table itself (migration 0021); the daemon's file-based
 *  outbox owns retry semantics now. */
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

      // 3. Pick the cycle's seed set: NAP_PER_CYCLE_CAP least-recently-napped
      //    memories. NULLS FIRST means rows that have never been napped go
      //    first, so a new corpus drains its backlog before round-robining.
      //    Bounding here is what keeps the relate + supersede passes under
      //    Railway's 2-min Postgres statement_timeout — without it, both
      //    queries fan out into ~7k LATERAL HNSW lookups and time out.
      //    A partial functional index (migration 0019) makes this O(log n).
      const seedRows = await tx<{ id: string }[]>`
        SELECT id FROM memories
        WHERE archived_at IS NULL AND embedding IS NOT NULL
        ORDER BY meta->>'last_napped_at' NULLS FIRST,
                 created_at ASC
        LIMIT ${NAP_PER_CYCLE_CAP}
      `;
      const seedIds = seedRows.map((r) => r.id);

      // 4. Semantic relations on the seed set. Inner LATERAL still scans
      //    the full memories table for HNSW lookups, so each seed gets
      //    its real nearest neighbours regardless of which seeds were
      //    picked this cycle. Mutual UNION means an off-page memory N
      //    that's near a seed S still gets `S` appended to its own
      //    related_to — pagination doesn't drop edges, only delays
      //    re-checks of already-paginated rows.
      const related = seedIds.length === 0
        ? { count: 0 }
        : await tx`
            WITH seeds AS (
              SELECT id, embedding, repo
              FROM memories
              WHERE id = ANY(${seedIds})
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

      // 5. Rule-based supersede pass on the seed set as the OLDER position.
      //    Inner LATERAL again has full visibility, so a seed can be
      //    superseded by a non-seed newer memory. Outer is bounded to the
      //    seed page; SUPERSEDE_RULE_PER_CYCLE_CAP stays as the OUTPUT cap.
      const supersededRows = seedIds.length === 0
        ? []
        : await tx<{ older_id: string; newer_id: string }[]>`
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
              WHERE o.id = ANY(${seedIds})
                AND o.archived_at IS NULL
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

      // 6. Stamp last_napped_at on every seed, regardless of whether
      //    relate or supersede found anything for that row. This is what
      //    drives the round-robin: seeds that find nothing this cycle
      //    don't get re-picked next cycle ahead of memories that have
      //    never been napped at all.
      if (seedIds.length > 0) {
        await tx`
          UPDATE memories
          SET meta = jsonb_set(
            COALESCE(meta, '{}'::jsonb),
            '{last_napped_at}',
            to_jsonb(now()::text)
          )
          WHERE id = ANY(${seedIds})
        `;
      }

      return {
        decayed: decayed.count,
        shadowed: shadowed.count,
        related: related.count,
        superseded: supersededRows.length,
      };
    });
    Logger.info("nap: done", result);
    return result;
  },
);
