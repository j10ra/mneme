import { Logger, mnemeFn } from "@mneme/core";
import { sha256Hex, sql } from "../db.ts";
import { EMBEDDER_MODEL } from "../embedder/index.ts";
import { extractObservations, type Observation } from "../llm/index.ts";

const COALESCE_WINDOW = "5 minutes";
// Caps on prompt size — keeps the LLM input within typical context windows
// regardless of provider (qwen2.5 32K context, gpt-oss-20b 8K TPM-safe, etc.)
// and bounds extraction latency on slower local models.
const MAX_CHARS_PER_CAPTURE = 1500;
const MAX_TOTAL_CHARS = 6000;

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export type ExtractResult = { didWork: boolean; pauseMs?: number };

type SeedRow = {
  job_id: string;
  capture_id: string;
  session_id: string | null;
  captured_at: Date;
  machine_id: string;
  repo: string | null;
  harness: string;
  agent: string | null;
  topics: string[];
  private: boolean;
};

type LockedRow = {
  job_id: string;
  capture_id: string;
  content: string;
  captured_at: Date;
};

/** Run one extract cycle: lock a queued job + its session siblings, call Groq,
 *  insert memories, enqueue embed jobs. On rate limit, re-queues without
 *  burning an attempt and returns pauseMs so the loop can back off. */
export const runExtractOnce = mnemeFn(
  "worker.extract.once",
  async (): Promise<ExtractResult> => {
    return await sql.begin(async (tx) => {
      const seeds = await tx<SeedRow[]>`
        SELECT j.id              AS job_id,
               j.capture_id      AS capture_id,
               c.session_id      AS session_id,
               c.captured_at     AS captured_at,
               c.machine_id      AS machine_id,
               c.repo            AS repo,
               c.harness         AS harness,
               c.agent           AS agent,
               c.topics          AS topics,
               c.private         AS private
        FROM ingest_jobs j
        JOIN captures c ON c.id = j.capture_id
        WHERE j.phase = 'extract'
          AND j.state IN ('queued', 'error')
          AND j.attempts < 5
          AND j.scheduled_at <= now()
        ORDER BY j.scheduled_at ASC
        LIMIT 1
        FOR UPDATE OF j SKIP LOCKED
      `;
      const seed = seeds[0];
      if (!seed) return { didWork: false };

      const locked = await tx<LockedRow[]>`
        UPDATE ingest_jobs j
        SET state = 'running', started_at = now(), attempts = attempts + 1, error = NULL
        FROM captures c
        WHERE j.capture_id = c.id
          AND j.phase = 'extract'
          AND j.state IN ('queued', 'error')
          AND j.attempts < 5
          AND (
            j.id = ${seed.job_id}
            OR (
              ${seed.session_id}::text IS NOT NULL
              AND c.session_id = ${seed.session_id}
              AND c.captured_at
                  BETWEEN ${seed.captured_at}::timestamptz - interval '${sql.unsafe(COALESCE_WINDOW)}'
                      AND ${seed.captured_at}::timestamptz + interval '${sql.unsafe(COALESCE_WINDOW)}'
            )
          )
        RETURNING j.id AS job_id, j.capture_id AS capture_id, c.content AS content, c.captured_at AS captured_at
      `;

      const ordered = locked.sort(
        (a, b) => a.captured_at.getTime() - b.captured_at.getTime(),
      );
      const captureIds = ordered.map((r) => r.capture_id);
      const jobIds = ordered.map((r) => r.job_id);
      const concatenated = clip(
        ordered.map((r) => clip(r.content, MAX_CHARS_PER_CAPTURE)).join("\n\n---\n\n"),
        MAX_TOTAL_CHARS,
      );

      let observations: Observation[] = [];
      try {
        observations = await extractObservations(concatenated);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Logger.error(`extract failed for ${jobIds.length} job(s)`, e);
        await tx`
          UPDATE ingest_jobs
          SET state = 'error', error = ${msg}, finished_at = now()
          WHERE id = ANY(${jobIds})
        `;
        return { didWork: true };
      }

      let inserted = 0;
      for (const obs of observations) {
        const content = obs.content.trim();
        if (!content) continue;
        const contentHash = await sha256Hex(content);
        const chunkId = await sha256Hex(`${contentHash}:${EMBEDDER_MODEL}`);
        const importance = Math.max(0.1, Math.min(1, obs.importance));
        const meta = {
          source_capture_ids: captureIds,
          extracted_kind: obs.kind,
        };

        const rows = await tx<{ id: string }[]>`
          INSERT INTO memories (
            capture_id, chunk_id, content, content_hash,
            embedding_model, tsv,
            kind, importance,
            machine_id, repo, harness, agent, topics, private,
            meta
          )
          VALUES (
            ${seed.capture_id}, ${chunkId}, ${content}, ${contentHash},
            ${EMBEDDER_MODEL}, to_tsvector('english', ${content}),
            ${obs.kind}, ${importance},
            ${seed.machine_id}, ${seed.repo}, ${seed.harness}, ${seed.agent},
            ${obs.topics ?? []}, ${seed.private},
            ${sql.json(meta as never)}
          )
          ON CONFLICT (chunk_id) DO NOTHING
          RETURNING id
        `;
        const memoryId = rows[0]?.id;
        if (memoryId) {
          inserted++;
          await tx`
            INSERT INTO ingest_jobs (memory_id, phase, state)
            VALUES (${memoryId}, 'embed', 'queued')
          `;
        }
      }

      await tx`
        UPDATE ingest_jobs
        SET state = 'done', finished_at = now()
        WHERE id = ANY(${jobIds})
      `;

      Logger.info(
        `extract: ${jobIds.length} capture(s) → ${observations.length} observation(s) → ${inserted} new memor${
          inserted === 1 ? "y" : "ies"
        }`,
      );
      return { didWork: true };
    });
  },
);
