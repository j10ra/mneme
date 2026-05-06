import { Logger, mnemeFn } from "@mneme/core";
import { sha256Hex, sql } from "../db.ts";
import { EMBEDDER_MODEL } from "../embedder/index.ts";
import { pickExtract, reportFailure, reportSuccess } from "../llm/pick.ts";
import type { Observation } from "../llm/types.ts";

const COALESCE_WINDOW = "5 minutes";
// Per-provider sibling and prompt-size caps come from the picker — local
// stays conservative under the CF Tunnel 100s no-data window (3000 chars ≈
// 750 user tokens, ~25s prompt-eval on 7B, comfortably inside the wall);
// OpenRouter can be much more generous because there's no tunnel in the
// path and 72B-class models handle big prompts cheaply. See the per-
// provider `extractLimits` constants in llm/providers/*.ts for values.
//
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

    // Pick the provider for this whole cycle. Locking + concat use its
    // limits; the LLM call uses the same provider; success/failure feeds
    // its breaker. Calling the picker once keeps decisions consistent
    // even if breakers flip mid-cycle.
    const { provider, providerName, limits } = pickExtract();

    // ── Phase 1: lock (short tx) ───────────────────────────────────────
    const locked = await sql.begin(async (tx) => {
      const seeds = await tx<
        {
          job_id: string;
          capture_id: string;
          session_id: string | null;
          captured_at: Date;
          repo: string | null;
          private: boolean;
        }[]
      >`
        SELECT j.id AS job_id, j.capture_id, c.session_id, c.captured_at,
               c.repo, c.private
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

      // Pick siblings (capped) — same session, within coalesce window, AND
      // homogeneous scope: same `private` flag and same `repo` as seed. A
      // batch with mixed scope would write a single memory tagged with seed's
      // values, leaking private content into a public row or mis-attributing
      // a capture's repo. The session_id filter is necessary but not
      // sufficient (a session can span sub-repos via cwd changes mid-session,
      // and a future flow could mix private/public captures within one
      // session).
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
          AND c.private = ${seed.private}
          AND c.repo IS NOT DISTINCT FROM ${seed.repo}
          AND c.captured_at
              BETWEEN ${seed.captured_at}::timestamptz - interval '${sql.unsafe(COALESCE_WINDOW)}'
                  AND ${seed.captured_at}::timestamptz + interval '${sql.unsafe(COALESCE_WINDOW)}'
        ORDER BY c.captured_at ASC
        LIMIT ${limits.maxSiblings - 1}
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
      ordered
        .map((r) => clip(r.content, limits.maxCharsPerCapture))
        .join("\n\n---\n\n"),
      limits.maxTotalChars,
    );

    // ── Phase 2: LLM call (NO tx held) ─────────────────────────────────
    Logger.info("extract: calling LLM", {
      provider: providerName,
      captures: jobIds.length,
      chars: concatenated.length,
      repo: seed.repo ?? "-",
    });
    const t0 = Date.now();
    let observations: Observation[];
    try {
      observations = await provider.extractObservations(concatenated);
      reportSuccess(providerName);
      if (consecutiveFailures > 0) {
        Logger.info("extract: circuit breaker recovered", {
          prior_failures: consecutiveFailures,
        });
        consecutiveFailures = 0;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const elapsed_s = Number(((Date.now() - t0) / 1000).toFixed(1));
      reportFailure(providerName);
      Logger.error("extract: failed", e, {
        provider: providerName,
        jobs: jobIds.length,
        elapsed_s,
      });
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
    // Wrap in try/catch: a write failure (DB blip, unique constraint,
    // serialization error) used to leave jobs stranded in `state='running'`
    // until STALE_RUNNING re-eligibled them. Once `attempts` reached 5 the
    // selector excluded them and nap's resurrect logic only inspects rows in
    // `state='error'` — they became permanently invisible. Surface failures
    // as `error` so nap can either retry (transient) or retire (dead).
    let inserted = 0;
    try {
      inserted = await sql.begin(async (tx) => {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Logger.error("extract: write failed", e, { jobs: jobIds.length });
      await sql`
        UPDATE ingest_jobs
        SET state = 'error',
            error = ${msg},
            finished_at = now(),
            scheduled_at = now() + (attempts * interval '2 minutes')
        WHERE id = ANY(${jobIds})
      `;
      return { didWork: true };
    }

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
