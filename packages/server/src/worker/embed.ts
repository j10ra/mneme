import { Logger, mnemeFn } from "@mneme/core";
import { sql } from "../db.ts";
import { embedBatch } from "../embedder/index.ts";

const BATCH_SIZE = 32;
// A 'running' embed job older than this is treated as crashed mid-flight.
const STALE_RUNNING = "5 minutes";

type LockedRow = {
  job_id: string;
  memory_id: string;
  content: string;
};

export type EmbedResult = { didWork: boolean; pauseMs?: number };

/** Run one embed cycle in three short steps. Like extract, the embedder call
 *  must NOT happen inside an open tx — it would pin a pool client and starve
 *  /api/capture under load. */
export const runEmbedOnce = mnemeFn(
  "worker.embed.once",
  async (): Promise<EmbedResult> => {
    // ── Phase 1: lock (short tx) ───────────────────────────────────────
    const locked = await sql<LockedRow[]>`
      UPDATE ingest_jobs j
      SET state = 'running', started_at = now(), attempts = attempts + 1, error = NULL
      FROM memories m
      WHERE j.memory_id = m.id
        AND j.id IN (
          SELECT id FROM ingest_jobs
          WHERE phase = 'embed'
            AND memory_id IS NOT NULL
            AND attempts < 5
            AND scheduled_at <= now()
            AND (
              state IN ('queued', 'error')
              OR (state = 'running' AND started_at < now() - interval '${sql.unsafe(STALE_RUNNING)}')
            )
          ORDER BY scheduled_at ASC
          LIMIT ${BATCH_SIZE}
          FOR UPDATE SKIP LOCKED
        )
      RETURNING j.id AS job_id, j.memory_id AS memory_id, m.content AS content
    `;

    if (locked.length === 0) return { didWork: false };

    const jobIds = locked.map((r) => r.job_id);
    const memoryIds = locked.map((r) => r.memory_id);
    const texts = locked.map((r) => r.content);

    // ── Phase 2: embedder call (NO tx held) ────────────────────────────
    const totalChars = texts.reduce((n, t) => n + t.length, 0);
    Logger.info(`embed: calling embedder (${locked.length} text(s), ${totalChars} chars)…`);
    const t0 = Date.now();
    let vectors: number[][];
    try {
      vectors = await embedBatch(texts);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      Logger.error(`embed batch failed for ${jobIds.length} job(s) after ${elapsed}s`, e);
      await sql`
        UPDATE ingest_jobs
        SET state = 'error',
            error = ${msg},
            finished_at = now(),
            scheduled_at = now() + (attempts * interval '30 seconds')
        WHERE id = ANY(${jobIds})
      `;
      return { didWork: true };
    }

    // ── Phase 3: write (short tx) ──────────────────────────────────────
    await sql.begin(async (tx) => {
      for (let i = 0; i < locked.length; i++) {
        const memoryId = memoryIds[i]!;
        const vec = vectors[i]!;
        await tx`
          UPDATE memories
          SET embedding = ${`[${vec.join(",")}]`}::vector
          WHERE id = ${memoryId}
        `;
      }
      await tx`
        UPDATE ingest_jobs
        SET state = 'done', finished_at = now()
        WHERE id = ANY(${jobIds})
      `;
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    Logger.info(
      `embed: ${locked.length} memor${locked.length === 1 ? "y" : "ies"} embedded (${elapsed}s)`,
    );
    return { didWork: true };
  },
);
