// Crystallize coordination endpoints.
//
// The daemon owns the LLM cost (one Claude call per repo); the server
// owns the lock + the candidate query + the concept write. Four routes:
//
//   POST /api/crystallize/lock         - try to claim a window via _ops.crystallize_runs
//   POST /api/crystallize/lock/release - abandon an in-flight window claim
//   GET  /api/crystallize/candidates   - return eligible clusters (or top-importance loose
//                                        memories as fallback) for the given repo
//   POST /api/crystallize/concepts     - daemon submits synthesized concept rows; server
//                                        writes mutable-in-place with history snapshot
//
// Leader election mirrors dream.ts: INSERT ON CONFLICT DO NOTHING is the
// race primitive. Stale claims (completed_at IS NULL and older than
// STALE_LOCK_MS) are reaped opportunistically inside acquireCrystallizeLock.

import type { Hono } from "hono";
import { currentAuth, mnemeRoute, requireAuth } from "@mneme/core";
import { CRYSTALLIZE_CONCEPT_IMPORTANCE, CRYSTALLIZE_HISTORY_LIMIT } from "../infra/config.ts";
import { sha256Hex, sql } from "../infra/db.ts";

const STALE_LOCK_MS = 30 * 60_000;

export async function acquireCrystallizeLock(
  windowKey: number,
  machineId: string,
): Promise<{ acquired: true } | { acquired: false; heldBy: string }> {
  // Opportunistically reap a stale claim, then try to insert.
  await sql`
    DELETE FROM _ops.crystallize_runs
    WHERE window_key = ${windowKey} AND completed_at IS NULL
      AND claimed_at < now() - ${`${STALE_LOCK_MS} milliseconds`}::interval`;
  const rows = await sql<{ claimed_by_machine_id: string }[]>`
    INSERT INTO _ops.crystallize_runs (window_key, claimed_by_machine_id)
    VALUES (${windowKey}, ${machineId})
    ON CONFLICT (window_key) DO NOTHING
    RETURNING claimed_by_machine_id`;

  if (rows.length > 0) return { acquired: true };
  const [held] = await sql<{ claimed_by_machine_id: string }[]>`
    SELECT claimed_by_machine_id FROM _ops.crystallize_runs WHERE window_key = ${windowKey}`;

  return { acquired: false, heldBy: held?.claimed_by_machine_id ?? "unknown" };
}

export async function releaseCrystallizeLock(
  windowKey: number,
  machineId: string,
  conceptCount: number,
): Promise<void> {
  await sql`
    UPDATE _ops.crystallize_runs
    SET completed_at = now(), concept_count = ${conceptCount}
    WHERE window_key = ${windowKey} AND claimed_by_machine_id = ${machineId}`;
}

export async function abortCrystallizeLock(windowKey: number, machineId: string): Promise<void> {
  await sql`
    DELETE FROM _ops.crystallize_runs
    WHERE window_key = ${windowKey} AND claimed_by_machine_id = ${machineId}
      AND completed_at IS NULL`;
}

export type ConceptSubmission = {
  concept_id: string;
  concept_type: string;
  title: string;
  body: string;
  tags: string[];
  related_to: string[];
  source_member_ids: string[];
  repo: string;
  embedding_model: string;
  body_embedding: number[];
};
export type ConceptsBody = { window_key: number; concepts: ConceptSubmission[] };

export async function writeConcepts(
  body: ConceptsBody,
  machineId: string,
): Promise<{ written: number; updated: number }> {
  let written = 0,
    updated = 0;

  await sql.begin(async (tx) => {
    for (const c of body.concepts) {
      const contentHash = await sha256Hex(c.body);
      const vec = `[${c.body_embedding.join(",")}]`;
      const meta = {
        concept_id: c.concept_id,
        concept_type: c.concept_type,
        title: c.title,
        related_to: c.related_to,
        source_member_ids: c.source_member_ids,
        refreshed_at: new Date().toISOString(),
        distiller_provider: "anthropic",
        distiller_model: "claude-sonnet",
      };
      // Existing concept for this (repo, concept_id)?
      const [existing] = await tx<{ id: string; content: string; confirmed: boolean }[]>`
        SELECT id, content, COALESCE((meta->>'confirmed')::boolean, false) AS confirmed
        FROM memories
        WHERE kind = 'concept' AND repo = ${c.repo} AND meta->>'concept_id' = ${c.concept_id}
        LIMIT 1`;

      if (existing) {
        if (existing.confirmed) {
          // Refresh edges only, never body.
          await tx`
            UPDATE memories SET meta = meta
              || ${sql.json({ related_to: c.related_to, source_member_ids: c.source_member_ids, refreshed_at: meta.refreshed_at })}
            WHERE id = ${existing.id}`;
          continue;
        }

        // Snapshot prior body, refresh in place. Append old body to history.
        await tx`
          UPDATE memories
          SET content = ${c.body}, content_hash = ${contentHash},
              embedding = ${vec}::vector, embedding_model = ${c.embedding_model},
              tsv = to_tsvector('english', ${c.body}),
              importance = ${CRYSTALLIZE_CONCEPT_IMPORTANCE},
              meta = (meta || ${sql.json(meta)})
                || jsonb_build_object('history',
                     COALESCE(meta->'history', '[]'::jsonb)
                     || jsonb_build_array(jsonb_build_object('content', ${existing.content}, 'at', ${meta.refreshed_at})))
          WHERE id = ${existing.id}`;
        // Trim history to the most-recent CRYSTALLIZE_HISTORY_LIMIT entries, preserving order.
        await tx`
          UPDATE memories
          SET meta = jsonb_set(meta, '{history}',
            (SELECT COALESCE(jsonb_agg(e ORDER BY n), '[]'::jsonb)
             FROM (SELECT e, n FROM jsonb_array_elements(meta->'history') WITH ORDINALITY t(e, n)
                   ORDER BY n DESC LIMIT ${CRYSTALLIZE_HISTORY_LIMIT}) s))
          WHERE id = ${existing.id}`;
        updated += 1;
        continue;
      }

      // New concept: synthetic capture for provenance, then insert the row.
      const [cap] = await tx<{ id: string }[]>`
        INSERT INTO captures (content, content_sha256, source, machine_id, hostname, repo, harness, agent, topics, private, raw_meta)
        VALUES (${c.body}, ${contentHash}, 'crystallize', ${machineId}, 'crystallize', ${c.repo}, 'crystallize', 'crystallize', ${c.tags}, false, ${sql.json({ concept: true })})
        ON CONFLICT (content_sha256, machine_id) DO UPDATE SET content = EXCLUDED.content
        RETURNING id`;
      const chunkId = await sha256Hex(
        `${contentHash}:${c.embedding_model}:concept:${c.concept_id}`,
      );

      await tx`
        INSERT INTO memories (capture_id, chunk_id, content, content_hash, embedding_model, embedding, tsv, kind, importance, machine_id, repo, harness, agent, topics, private, meta)
        VALUES (${cap!.id}, ${chunkId}, ${c.body}, ${contentHash}, ${c.embedding_model}, ${vec}::vector, to_tsvector('english', ${c.body}), 'concept', ${CRYSTALLIZE_CONCEPT_IMPORTANCE}, ${machineId}, ${c.repo}, 'crystallize', 'crystallize', ${c.tags}, false, ${sql.json({ ...meta, history: [] })})
        ON CONFLICT (chunk_id) DO NOTHING`;
      written += 1;
    }
  });

  return { written, updated };
}

export function mountCrystallizeRoutes(app: Hono): void {
  app.post(
    "/api/crystallize/lock",
    mnemeRoute("api.crystallize.lock"),
    requireAuth("capture"),
    async (c) => {
      const { window_key } = (await c.req.json()) as { window_key: number };
      const auth = currentAuth();

      if (!auth?.machineId)
        return c.json({ error: "crystallize lock requires per-machine token" }, 400);
      const r = await acquireCrystallizeLock(window_key, auth.machineId);

      return r.acquired ? c.json({ ok: true }) : c.json({ heldBy: r.heldBy }, 409);
    },
  );

  app.post(
    "/api/crystallize/lock/release",
    mnemeRoute("api.crystallize.lock.release"),
    requireAuth("capture"),
    async (c) => {
      const { window_key } = (await c.req.json()) as { window_key: number };
      const auth = currentAuth();

      if (!auth?.machineId)
        return c.json({ error: "crystallize lock release requires per-machine token" }, 400);
      await abortCrystallizeLock(window_key, auth.machineId);

      return c.json({ ok: true });
    },
  );

  app.get(
    "/api/crystallize/candidates",
    mnemeRoute("api.crystallize.candidates"),
    requireAuth("capture"),
    async (c) => {
      const repo = c.req.query("repo") ?? "";
      const auth = currentAuth();

      if (!auth?.machineId) return c.json({ error: "candidates require per-machine token" }, 400);
      const machineId = auth.machineId;
      const clusters = await sql<
        { id: string; content: string; title: string; created_at: Date }[]
      >`
        SELECT id, content, meta->>'cluster_title' AS title, created_at FROM memories
        WHERE kind = 'cluster' AND repo = ${repo} AND archived_at IS NULL
          AND (meta->>'superseded_by') IS NULL
          AND (private = false OR machine_id = ${machineId})
        ORDER BY importance DESC LIMIT 200`;

      if (clusters.length > 0) return c.json({ source: "clusters", items: clusters });
      // Fallback: 0-cluster repo -- synthesize from top-importance loose memories.
      const loose = await sql<{ id: string; content: string; created_at: Date }[]>`
        SELECT id, content, created_at FROM memories
        WHERE repo = ${repo} AND archived_at IS NULL AND kind <> 'concept'
          AND (meta->>'superseded_by') IS NULL
          AND (private = false OR machine_id = ${machineId})
        ORDER BY importance DESC, created_at DESC LIMIT 60`;

      return c.json({ source: "loose", items: loose });
    },
  );

  app.post(
    "/api/crystallize/concepts",
    mnemeRoute("api.crystallize.concepts"),
    requireAuth("capture"),
    async (c) => {
      const body = (await c.req.json()) as ConceptsBody;
      const auth = currentAuth();

      if (!auth?.machineId)
        return c.json({ error: "concepts submit requires per-machine token" }, 400);
      const result = await writeConcepts(body, auth.machineId);

      await releaseCrystallizeLock(
        body.window_key,
        auth.machineId,
        result.written + result.updated,
      );

      return c.json(result);
    },
  );
}
