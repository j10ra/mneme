import { Logger, mnemeFn } from "@mneme/core";
import { sql } from "../db.ts";
import { embedBatch } from "../voyage.ts";

const BATCH_SIZE = 32;

type LockedRow = {
  job_id: string;
  memory_id: string;
  content: string;
};

export type EmbedResult = { didWork: boolean; pauseMs?: number };

/** Run one embed cycle: lock up to BATCH_SIZE queued embed jobs, batch-call
 *  Voyage, write embeddings, mark done. */
export const runEmbedOnce = mnemeFn(
  "worker.embed.once",
  async (): Promise<EmbedResult> => {
    return await sql.begin(async (tx) => {
      const locked = await tx<LockedRow[]>`
        UPDATE ingest_jobs j
        SET state = 'running', started_at = now(), attempts = attempts + 1, error = NULL
        FROM memories m
        WHERE j.memory_id = m.id
          AND j.id IN (
            SELECT id FROM ingest_jobs
            WHERE phase = 'embed'
              AND state IN ('queued', 'error')
              AND memory_id IS NOT NULL
              AND attempts < 5
              AND scheduled_at <= now()
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

      let vectors: number[][];
      try {
        vectors = await embedBatch(texts);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Voyage 429: re-queue without burning attempt, pause briefly.
        if (msg.includes("429")) {
          await tx`
            UPDATE ingest_jobs
            SET state = 'queued', started_at = NULL, attempts = GREATEST(0, attempts - 1)
            WHERE id = ANY(${jobIds})
          `;
          Logger.warn(`embed rate-limited (${jobIds.length} job(s) re-queued, sleeping 30s)`);
          return { didWork: false, pauseMs: 30_000 };
        }
        Logger.error(`embed batch failed for ${jobIds.length} job(s)`, e);
        await tx`
          UPDATE ingest_jobs
          SET state = 'error', error = ${msg}, finished_at = now()
          WHERE id = ANY(${jobIds})
        `;
        return { didWork: true };
      }

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

      Logger.info(`embed: ${locked.length} memor${locked.length === 1 ? "y" : "ies"} embedded`);
      return { didWork: true };
    });
  },
);
