import { Logger, mnemeFn } from "@mneme/core";
import { sha256Hex, sql } from "../db.ts";
import { EMBEDDER_MODEL } from "../embedder/index.ts";
import { extractObservations, type Observation } from "../llm/index.ts";

const COALESCE_WINDOW = "5 minutes";
// Cap how many session-sibling captures one extract cycle locks together.
// Without this, a busy session can balloon to 60+ jobs marked 'running' under
// a single LLM call, multiplying the blast radius of any provider failure.
const MAX_SIBLINGS = 10;
// Caps on prompt size — keeps the LLM input within typical context windows
// regardless of provider and, more importantly, keeps prompt processing
// time short. On a CPU-only homelab box at ~30-50 tok/s prompt throughput,
// a 6000-char prompt was 45-75s of silent processing before any SSE chunk
// flowed; that pushed cycles past the 90s client timeout AND risked CF
// 524s (no-data window). 3000 chars ≈ ~750 user tokens, processed in
// ~15-25s on 3B, well inside the streaming budget.
const MAX_CHARS_PER_CAPTURE = 1500;
const MAX_TOTAL_CHARS = 3000;
// A 'running' job older than this is treated as crashed mid-flight and
// re-eligible. Bounded by the LLM TIMEOUT_MS plus headroom.
const STALE_RUNNING = "15 minutes";

// Circuit breaker — when the LLM is down or saturated, stop generating load
// so the upstream can recover. After FAILURE_THRESHOLD consecutive cycle
// failures, pause the worker for BREAKER_PAUSE_MS. The first success after
// reopen resets the counter. This complements the per-job backoff: per-job
// backoff staggers retries of the same captures, the breaker stops *new*
// captures (attempts=0) from piling fresh load onto a failing endpoint.
const FAILURE_THRESHOLD = 3;
const BREAKER_PAUSE_MS = 5 * 60_000;
let consecutiveFailures = 0;
let breakerOpenUntil = 0;

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export type ExtractResult = { didWork: boolean; pauseMs?: number };

type LockedRow = {
  job_id: string;
  capture_id: string;
  session_id: string | null;
  captured_at: Date;
  content: string;
  machine_id: string;
  repo: string | null;
  harness: string;
  agent: string | null;
  private: boolean;
};

/** Run one extract cycle. Three short transactions, NEVER hold a tx across
 *  the LLM call — that would pin a pool client for minutes and exhaust the
 *  Supabase pool (max 15 in session mode):
 *    1. lock: pick seed + ≤MAX_SIBLINGS coalesce candidates, mark running
 *    2. LLM call: outside any tx
 *    3. write: insert memories, enqueue embed jobs, mark done */
export const runExtractOnce = mnemeFn(
  "worker.extract.once",
  async (): Promise<ExtractResult> => {
    // Circuit breaker — short-circuit if the LLM has been failing.
    const now = Date.now();
    if (now < breakerOpenUntil) {
      return { didWork: false, pauseMs: breakerOpenUntil - now };
    }

    // ── Phase 1: lock (short tx) ───────────────────────────────────────
    const locked = await sql.begin(async (tx) => {
      const seeds = await tx<{ job_id: string; capture_id: string; session_id: string | null; captured_at: Date }[]>`
        SELECT j.id AS job_id, j.capture_id, c.session_id, c.captured_at
        FROM ingest_jobs j
        JOIN captures c ON c.id = j.capture_id
        WHERE j.phase = 'extract'
          AND j.attempts < 5
          AND j.scheduled_at <= now()
          AND (
            j.state IN ('queued', 'error')
            OR (j.state = 'running' AND j.started_at < now() - interval '${sql.unsafe(STALE_RUNNING)}')
          )
        ORDER BY j.scheduled_at ASC
        LIMIT 1
        FOR UPDATE OF j SKIP LOCKED
      `;
      const seed = seeds[0];
      if (!seed) return [] as LockedRow[];

      // Pick siblings (capped) — same session, within coalesce window.
      const siblingIds = await tx<{ job_id: string }[]>`
        SELECT j.id AS job_id
        FROM ingest_jobs j
        JOIN captures c ON c.id = j.capture_id
        WHERE j.phase = 'extract'
          AND j.attempts < 5
          AND j.scheduled_at <= now()
          AND (
            j.state IN ('queued', 'error')
            OR (j.state = 'running' AND j.started_at < now() - interval '${sql.unsafe(STALE_RUNNING)}')
          )
          AND j.id <> ${seed.job_id}
          AND ${seed.session_id}::text IS NOT NULL
          AND c.session_id = ${seed.session_id}
          AND c.captured_at
              BETWEEN ${seed.captured_at}::timestamptz - interval '${sql.unsafe(COALESCE_WINDOW)}'
                  AND ${seed.captured_at}::timestamptz + interval '${sql.unsafe(COALESCE_WINDOW)}'
        ORDER BY c.captured_at ASC
        LIMIT ${MAX_SIBLINGS - 1}
        FOR UPDATE OF j SKIP LOCKED
      `;

      const allJobIds = [seed.job_id, ...siblingIds.map((r) => r.job_id)];

      const rows = await tx<LockedRow[]>`
        UPDATE ingest_jobs j
        SET state = 'running', started_at = now(), attempts = attempts + 1, error = NULL
        FROM captures c
        WHERE j.capture_id = c.id
          AND j.id = ANY(${allJobIds})
        RETURNING j.id AS job_id,
                  j.capture_id AS capture_id,
                  c.session_id AS session_id,
                  c.captured_at AS captured_at,
                  c.content AS content,
                  c.machine_id AS machine_id,
                  c.repo AS repo,
                  c.harness AS harness,
                  c.agent AS agent,
                  c.private AS private
      `;
      return rows;
    });

    if (locked.length === 0) return { didWork: false };

    const ordered = locked.sort((a, b) => a.captured_at.getTime() - b.captured_at.getTime());
    const seed = ordered[0]!;
    const captureIds = ordered.map((r) => r.capture_id);
    const jobIds = ordered.map((r) => r.job_id);
    const concatenated = clip(
      ordered.map((r) => clip(r.content, MAX_CHARS_PER_CAPTURE)).join("\n\n---\n\n"),
      MAX_TOTAL_CHARS,
    );

    // ── Phase 2: LLM call (NO tx held) ─────────────────────────────────
    Logger.info("extract: calling LLM", {
      captures: jobIds.length,
      chars: concatenated.length,
      repo: seed.repo ?? "-",
    });
    const t0 = Date.now();
    let observations: Observation[];
    try {
      observations = await extractObservations(concatenated);
      if (consecutiveFailures > 0) {
        Logger.info("extract: circuit breaker recovered", {
          prior_failures: consecutiveFailures,
        });
        consecutiveFailures = 0;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const elapsed_s = Number(((Date.now() - t0) / 1000).toFixed(1));
      Logger.error("extract: failed", e, { jobs: jobIds.length, elapsed_s });
      await sql`
        UPDATE ingest_jobs
        SET state = 'error',
            error = ${msg},
            finished_at = now(),
            scheduled_at = now() + (attempts * interval '2 minutes')
        WHERE id = ANY(${jobIds})
      `;
      consecutiveFailures++;
      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        breakerOpenUntil = Date.now() + BREAKER_PAUSE_MS;
        Logger.warn("extract: circuit breaker open", undefined, {
          pause_min: BREAKER_PAUSE_MS / 60_000,
          consecutive_failures: consecutiveFailures,
        });
        consecutiveFailures = 0;
      }
      return { didWork: true };
    }

    // ── Phase 3: write (short tx) ──────────────────────────────────────
    const inserted = await sql.begin(async (tx) => {
      let n = 0;
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
          n++;
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
      return n;
    });

    const elapsed_s = Number(((Date.now() - t0) / 1000).toFixed(1));
    const kindCounts = observations.reduce<Record<string, number>>((acc, o) => {
      acc[o.kind] = (acc[o.kind] ?? 0) + 1;
      return acc;
    }, {});
    Logger.info("extract: done", {
      captures: jobIds.length,
      observations: observations.length,
      new_memories: inserted,
      kinds: kindCounts,
      repo: seed.repo ?? "-",
      elapsed_s,
    });
    return { didWork: true };
  },
);
