import { Logger, mnemeFn } from "@mneme/core";
import {
  NAP_DECAY_PER_CYCLE,
  NAP_FLOOR,
  NAP_PER_CYCLE_CAP,
  NAP_PIN_FLOOR,
  NAP_RELATE_DISTANCE,
  NAP_RELATE_MAX_NEIGHBORS,
  NAP_SHADOW_DECAY,
  RECALL_LTD_DECAY,
  SUPERSEDE_RULE_AGE_GAP,
  SUPERSEDE_RULE_COSINE_MAX,
  SUPERSEDE_RULE_KEYWORDS,
  SUPERSEDE_RULE_PER_CYCLE_CAP,
} from "../infra/config.ts";
import { sql } from "../infra/db.ts";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

/** Keyset-paginate memory ids and apply a bounded UPDATE per batch.
 *  `fetchBatch` returns up to `batchSize` ids strictly greater than the
 *  cursor, ascending. `apply` runs the batch UPDATE and returns the
 *  number of rows it affected. Iterating in id order with a monotonic
 *  cursor guarantees termination and bounds every statement, so a
 *  full-table pass never scales toward the 120s statement_timeout.
 *  Callers own the monotonicity invariant: a `fetchBatch` that does not
 *  return ids strictly greater than the cursor loops until Postgres
 *  statement_timeout fires.
 *  Pure control flow -- both callbacks are injected for testability. */
export async function forEachIdBatch(
  batchSize: number,
  fetchBatch: (cursor: string, limit: number) => Promise<string[]>,
  apply: (ids: string[]) => Promise<number>,
): Promise<number> {
  let cursor = ZERO_UUID;
  let affected = 0;
  for (;;) {
    const ids = await fetchBatch(cursor, batchSize);
    if (ids.length === 0) break;
    affected += await apply(ids);
    cursor = ids[ids.length - 1]!;
  }
  return affected;
}

export type NapResult = {
  decayed: number;
  ltp_decayed: number;
  shadowed: number;
  related: number;
  superseded: number;
};

const NAP_DECAY_BATCH = 5000;

/** Phase 1: importance decay, batched. Pinned rows floor at
 *  NAP_PIN_FLOOR, unpinned at NAP_FLOOR. Each batch UPDATE is its own
 *  statement, so no single statement scales with corpus size. */
async function napDecayImportance(): Promise<number> {
  return forEachIdBatch(
    NAP_DECAY_BATCH,
    async (cursor, limit) => {
      const rows = await sql<{ id: string }[]>`
        SELECT id::text AS id FROM memories
        WHERE archived_at IS NULL AND id > ${cursor}::uuid
        ORDER BY id LIMIT ${limit}
      `;
      return rows.map((r) => r.id);
    },
    async (ids) => {
      const r = await sql`
        UPDATE memories
        SET importance = GREATEST(
          CASE WHEN COALESCE((meta->>'pinned')::boolean, false)
               THEN ${NAP_PIN_FLOOR}::real ELSE ${NAP_FLOOR}::real END,
          importance * ${NAP_DECAY_PER_CYCLE}::real
        )
        WHERE id = ANY(${ids})
          AND importance > CASE
            WHEN COALESCE((meta->>'pinned')::boolean, false) THEN ${NAP_PIN_FLOOR}::real
            ELSE ${NAP_FLOOR}::real END
      `;
      return r.count;
    },
  );
}

/** Phase 1b: recall_weight (LTP) decay, batched. Fades use-driven
 *  reinforcement so weight reflects recent use; floors at 0.01. */
async function napDecayRecallWeight(): Promise<number> {
  return forEachIdBatch(
    NAP_DECAY_BATCH,
    async (cursor, limit) => {
      const rows = await sql<{ id: string }[]>`
        SELECT id::text AS id FROM memories
        WHERE archived_at IS NULL AND id > ${cursor}::uuid
        ORDER BY id LIMIT ${limit}
      `;
      return rows.map((r) => r.id);
    },
    async (ids) => {
      const r = await sql`
        UPDATE memories
        SET recall_weight = recall_weight * ${RECALL_LTD_DECAY}::real
        WHERE id = ANY(${ids}) AND recall_weight >= 0.01
      `;
      return r.count;
    },
  );
}

/** Phase 2: exact-text shadow-marking. Single statement in its own
 *  transaction. The UPDATE only touches rows in duplicate groups; the
 *  cost is the GROUP BY scan, which is fast. */
async function napShadowDuplicates(): Promise<number> {
  const shadowed = await sql`
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
  return shadowed.count;
}

/** Phase 3: seed-bounded relate + rule-supersede + stamp. One
 *  transaction -- the three steps share the seed set and must see a
 *  consistent view. Already bounded by NAP_PER_CYCLE_CAP. */
async function napSeedPhase(): Promise<{ related: number; superseded: number }> {
  return sql.begin(async (tx) => {
    const seedRows = await tx<{ id: string }[]>`
      SELECT id FROM memories
      WHERE archived_at IS NULL AND embedding IS NOT NULL
      ORDER BY meta->>'last_napped_at' NULLS FIRST,
               created_at ASC
      LIMIT ${NAP_PER_CYCLE_CAP}
    `;
    const seedIds = seedRows.map((r) => r.id);

    const related =
      seedIds.length === 0
        ? { count: 0 }
        : await tx`
            WITH seeds AS (
              SELECT id, embedding, repo FROM memories WHERE id = ANY(${seedIds})
            ),
            neighbors AS (
              SELECT s.id AS a_id, n.id AS b_id
              FROM seeds s,
              LATERAL (
                SELECT m.id FROM memories m
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
              FROM mutual GROUP BY a_id
            )
            UPDATE memories m
            SET meta = jsonb_set(
              m.meta, '{related_to}',
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
            WHERE m.id = g.a_id AND m.archived_at IS NULL
          `;

    const supersededRows =
      seedIds.length === 0
        ? []
        : await tx<{ older_id: string; newer_id: string }[]>`
            WITH pairs AS (
              SELECT o.id AS older_id, n.newer_id
              FROM memories o
              CROSS JOIN LATERAL (
                SELECT m.id AS newer_id FROM memories m
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

    if (seedIds.length > 0) {
      await tx`
        UPDATE memories
        SET meta = jsonb_set(COALESCE(meta, '{}'::jsonb),
                             '{last_napped_at}', to_jsonb(now()::text))
        WHERE id = ANY(${seedIds})
      `;
    }

    return { related: related.count, superseded: supersededRows.length };
  });
}

/** Run one nap cycle as four independent phases. No phase holds locks
 *  for the whole cycle, and a slow phase fails in isolation instead of
 *  rolling back the rest. */
export const runNapOnce = mnemeFn("worker.nap.once", async (): Promise<NapResult> => {
  const decayed = await napDecayImportance();
  const ltpDecayed = await napDecayRecallWeight();
  const shadowed = await napShadowDuplicates();
  const seed = await napSeedPhase();

  const result: NapResult = {
    decayed,
    ltp_decayed: ltpDecayed,
    shadowed,
    related: seed.related,
    superseded: seed.superseded,
  };
  Logger.info("nap: done", result);
  return result;
});
