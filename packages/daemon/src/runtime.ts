// Daemon runtime — capture handler + worker tick.
//
// This module is the core pipeline, kept free of HTTP / file-watcher
// glue so it's deterministic to test. index.ts wires Bun.serve and
// fs.watch around it.
//
// Pipeline shape (per capture, single-tick path):
//   captured/   raw capture body, scrubbed at handleCapture-time
//   observations/ { capture, memories[] }   memories carry only the LLM-
//                                        derivable fields at this stage
//   embedded/  { capture, memories[] }   memories now have content_hash,
//                                        chunk_id, embedding, embedding_
//                                        model, meta
//   pushed     POST /api/bundle succeeds; file deleted
//   failed/    permanent error during any stage; file moved with reason
//
// Coalescing rule (matches the original architecture's ±5min session
// window): captures sharing (session_id, repo, private) within ±5
// minutes of the seed are observations in ONE LLM call, capped at
// MAX_BATCH_SIZE. The seed's bundle carries the LLM-derived memories;
// the other captures in the batch each push their own bundle with
// memories=[] (provenance row only). This matches today's server
// behavior where coalesced extract jobs link memories to the seed
// capture_id and other captures stand alone.

import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile as fsReadFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Logger } from "@mneme/core";
import { scrub, scrubData } from "@mneme/shared";
import { EMBEDDER_DIM, EMBEDDER_MODEL } from "./embed.ts";
import type { Outbox } from "./outbox.ts";
import type { Capture, ExtractedMemory, Memory } from "./agents/types.ts";

export type CaptureBody = {
  content: string;
  source: string;
  hostname: string;
  repo: string | null;
  harness: string;
  agent: string | null;
  session_id: string | null;
  topics: string[];
  private: boolean;
  raw_meta: Record<string, unknown>;
};

export type Bundle = {
  capture: Capture & { content_sha256: string };
  memories: Memory[];
};

export type HandleCaptureResult = { ok: true; id: string } | { ok: false; error: string };

export type DaemonDeps = {
  outbox: Outbox;
  extract: (captures: Capture[]) => Promise<ExtractedMemory[]>;
  embed: (texts: string[]) => Promise<number[][]>;
  push: (bundle: Bundle) => Promise<void>;
  /**
   * Override the embedder model name recorded on the bundle. Tests use
   * this to keep deterministic chunk_ids without spinning the real
   * model. Defaults to the constant from embed.ts.
   */
  embedderModel?: string;
  /** When captured count reaches this, run extract immediately. */
  extractBatchFull?: number;
  /** Wait until captured/ has been quiet for this long before extract. */
  extractIdleMs?: number;
  /** Force extract once the oldest captured capture is older than this. */
  extractForceMs?: number;
  /** Number of consecutive transient extract failures before a captured
   *  file gets escalated to failed/. Defaults to 5 — at ~2s ticks +
   *  claude-streaming's 90s per-turn timeout, that's roughly 7-8 minutes
   *  of repeated failure before we give up rather than retrying forever. */
  extractMaxRetries?: number;
  /** Test seam for `now()`. Defaults to Date.now. */
  now?: () => number;
  /** Override the dedup ledger directory. Defaults to ~/.mneme/shas/. */
  shasDir?: string;
};

const REQUIRED_STRING_FIELDS = ["content", "source", "hostname", "harness"] as const;
const COALESCE_WINDOW_MS = 5 * 60 * 1000;
// Bound per-call so observation quality stays high; oversize sessions
// chunk into back-to-back Haiku calls.
const MAX_BATCH_SIZE = 20;

// Second bound: a batch fills toward MAX_BATCH_SIZE but stops early once
// its combined content crosses this cap, so a code-heavy session (big
// Read/Edit/Bash captures) can't balloon a 20-member batch past what the
// extract turn timeout can chew — the dead-letter failure mode from the
// ph-money screenshot incident, minus the screenshots. Light captures
// still pack a full 20; heavy ones make smaller batches. The seed always
// rides alone if it alone exceeds the cap (per-capture cap keeps it well
// under, so that's only a safety net).
const MAX_BATCH_BYTES = 120_000;

// Aggressive defaults exist for tests (1-capture-per-call shape);
// production overrides via index.ts.
const DEFAULT_EXTRACT_BATCH_FULL = 1;
const DEFAULT_EXTRACT_IDLE_MS = 0;
const DEFAULT_EXTRACT_FORCE_MS = 0;
const DEFAULT_EXTRACT_MAX_RETRIES = 5;

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";

  for (const b of bytes) hex += b.toString(16).padStart(2, "0");

  return hex;
}

function scrubCapture(body: CaptureBody): CaptureBody {
  return {
    content: scrub(body.content),
    source: scrub(body.source),
    hostname: scrub(body.hostname),
    repo: body.repo ? scrub(body.repo) : null,
    harness: scrub(body.harness),
    agent: body.agent ? scrub(body.agent) : null,
    session_id: body.session_id ? scrub(body.session_id) : null,
    topics: (body.topics ?? []).map(scrub),
    private: !!body.private,
    raw_meta: scrubData(body.raw_meta ?? {}) as Record<string, unknown>,
  };
}

function asPermanent(err: unknown): boolean {
  return (
    err !== null && typeof err === "object" && (err as { permanent?: unknown }).permanent === true
  );
}

export function createRuntime(deps: DaemonDeps) {
  const embedderModel = deps.embedderModel ?? EMBEDDER_MODEL;
  const batchFull = deps.extractBatchFull ?? DEFAULT_EXTRACT_BATCH_FULL;
  const idleMs = deps.extractIdleMs ?? DEFAULT_EXTRACT_IDLE_MS;
  const forceMs = deps.extractForceMs ?? DEFAULT_EXTRACT_FORCE_MS;
  const maxRetries = deps.extractMaxRetries ?? DEFAULT_EXTRACT_MAX_RETRIES;
  const now = deps.now ?? (() => Date.now());

  // Per-file transient-extract retry counter. Lives for the daemon's
  // lifetime (resets on restart, which is fine — a file that's been
  // stuck across restarts gets a fresh budget, but the underlying SDK
  // session also got a fresh start so it has a real chance to succeed).
  // Keys are captured/ file ids. Entries are deleted on success,
  // permanent failure, or when the budget is exhausted.
  //
  // Bounds transient retries so a wedged streaming-claude subprocess
  // can't trap files in captured/ silently — without this budget,
  // runCoalescedExtract would `continue` on every throw with no log,
  // no failed/ row, heartbeat reporting OK.
  const transientRetries = new Map<string, number>();

  // Initialised to now() so the idle gate doesn't trip on the first
  // tick after startup just because the variable was 0 (epoch). Real
  // backlogs are caught by the forceMs trigger (oldest-file age) instead.
  let lastCapturedWriteAt = now();

  async function handleCapture(body: CaptureBody): Promise<HandleCaptureResult> {
    for (const field of REQUIRED_STRING_FIELDS) {
      const v = body[field];

      if (typeof v !== "string" || !v.trim()) {
        return { ok: false, error: `${field} required` };
      }
    }

    const cleaned = scrubCapture(body);
    const hash = await sha256Hex(cleaned.content);
    const id = `${Date.now()}-${hash.slice(0, 8)}`;

    await deps.outbox.writeRaw(id, cleaned);
    lastCapturedWriteAt = now();

    return { ok: true, id };
  }

  // Server is idempotent on bundle insert; this cap is just headroom.
  const PUSH_CONCURRENCY = 4;

  // Bound batch so quantized weights don't OOM; large enough to amortise
  // vs. per-file embed.
  const EMBED_BATCH_CAP = 64;

  async function runBatchedEmbed(): Promise<void> {
    const ids = await deps.outbox.list("observations");

    if (ids.length === 0) return;

    type Loaded = {
      id: string;
      capture: CaptureBody;
      memories: ExtractedMemory[];
    };
    const loaded: Loaded[] = [];

    for (const id of ids) {
      try {
        const data = (await deps.outbox.read(id, "observations")) as {
          capture: CaptureBody;
          memories: ExtractedMemory[];
        };

        loaded.push({ id, capture: data.capture, memories: data.memories });
      } catch {
        // file vanished mid-tick (e.g. parallel run); skip
      }
    }

    if (loaded.length === 0) return;

    // Flatten texts with origin pointers so we can fan vectors back out.
    const flatTexts: string[] = [];
    const origin: { fileIdx: number; memIdx: number }[] = [];

    for (let f = 0; f < loaded.length; f++) {
      const memories = loaded[f]!.memories;

      for (let m = 0; m < memories.length; m++) {
        flatTexts.push(memories[m]!.content);
        origin.push({ fileIdx: f, memIdx: m });
      }
    }

    // Single embed call (chunked at EMBED_BATCH_CAP for memory bounds).
    const allVectors: number[][] = [];

    if (flatTexts.length > 0) {
      for (let i = 0; i < flatTexts.length; i += EMBED_BATCH_CAP) {
        const chunk = flatTexts.slice(i, i + EMBED_BATCH_CAP);
        const part = await deps.embed(chunk);

        allVectors.push(...part);
      }
    }

    // Distribute vectors back per-file and transition each.
    for (let f = 0; f < loaded.length; f++) {
      const file = loaded[f]!;
      const enriched: Memory[] = [];

      for (let m = 0; m < file.memories.length; m++) {
        const mem = file.memories[m]!;
        const flatIdx = origin.findIndex((o) => o.fileIdx === f && o.memIdx === m);
        const vector = flatIdx >= 0 ? allVectors[flatIdx] : undefined;
        const contentHash = await sha256Hex(mem.content);
        const chunkId = await sha256Hex(`${contentHash}:${embedderModel}`);

        enriched.push({
          ...mem,
          content_hash: contentHash,
          chunk_id: chunkId,
          embedding: vector,
          embedding_model: embedderModel,
          meta: {
            extractor_provider: "anthropic",
            extractor_model: "claude-haiku",
          },
        });
      }

      try {
        await deps.outbox.transition(file.id, "observations", "embedded", {
          capture: file.capture,
          memories: enriched,
        });
      } catch (err) {
        if (asPermanent(err)) {
          const reason = err instanceof Error ? err.message : String(err);

          await deps.outbox.markFailed(file.id, "observations", reason);
        }
      }
    }
  }

  async function runParallelPush(): Promise<void> {
    const ids = await deps.outbox.list("embedded");

    if (ids.length === 0) return;

    for (let i = 0; i < ids.length; i += PUSH_CONCURRENCY) {
      const slice = ids.slice(i, i + PUSH_CONCURRENCY);

      await Promise.all(
        slice.map(async (id) => {
          let data: unknown;

          try {
            data = await deps.outbox.read(id, "embedded");
          } catch {
            return; // vanished mid-tick
          }

          try {
            const stage = data as { capture: CaptureBody; memories: Memory[] };
            const captureSha = await sha256Hex(stage.capture.content);
            const bundle: Bundle = {
              capture: { ...stage.capture, content_sha256: captureSha },
              memories: stage.memories,
            };

            await deps.push(bundle);
            await deps.outbox.delete(id, "embedded");
            Logger.info("bundle pushed", {
              id,
              source: stage.capture.source,
              bytes: stage.capture.content.length,
              memories: stage.memories.length,
            });
          } catch (err) {
            if (asPermanent(err)) {
              const reason = err instanceof Error ? err.message : String(err);

              await deps.outbox.markFailed(id, "embedded", reason);
            }
          }
        }),
      );
    }
  }

  // ── Dedup ledger ────────────────────────────────────────────────────────
  // Per-session content+uuid index at ~/.mneme/shas/<session_id>.txt.
  // Each line is either `sha:<hex>` or `uuid:<hex>`. Both keys are recorded
  // so transcript-replay captures (which have stable message_uuid across
  // replays but possibly drift in content sha due to timestamp / id
  // re-rendering) get caught by uuid; UserPromptSubmit / PostToolUse
  // captures (no uuid) are caught by content sha. Either match => dup.
  //
  // Dedup ledger lives daemon-side so the hook stays dumb: write file,
  // exit. All dedup logic in one place.
  const SHAS_DIR = deps.shasDir ?? join(homedir(), ".mneme", "shas");

  function shasFile(sessionId: string): string {
    return join(SHAS_DIR, `${sessionId}.txt`);
  }

  async function loadSessionLedger(sessionId: string): Promise<Set<string>> {
    const file = shasFile(sessionId);

    if (!existsSync(file)) return new Set();

    try {
      const buf = await fsReadFile(file, "utf8");

      return new Set(buf.split("\n").filter(Boolean));
    } catch {
      return new Set();
    }
  }

  async function appendLedger(sessionId: string, keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      if (!existsSync(SHAS_DIR)) {
        await mkdir(SHAS_DIR, { recursive: true, mode: 0o700 });
      }

      await appendFile(shasFile(sessionId), `${keys.join("\n")}\n`, {
        mode: 0o600,
      });
    } catch {
      // best-effort. Worst case we let a dup through; the server still
      // dedupes via (content_sha256, machine_id) so the DB stays clean.
    }
  }

  /** Drop duplicate captures in captured/. Runs before extract so the
   *  Haiku subprocess never sees the same logical event twice.
   *
   *  Dedup against two sources of truth:
   *    (a) the persistent per-session ledger (entries from PRIOR ticks
   *        that have already gone through extract — recorded by
   *        recordAcceptedKeys() after a successful captured→observations
   *        transition)
   *    (b) the within-tick set of shas seen so far (collapses near-
   *        simultaneous duplicates that landed in captured/ before any
   *        of them reached the ledger)
   *
   *  Files that match either source get deleted. The ledger is NOT
   *  written here — only by recordAcceptedKeys() once a file moves to
   *  observations/. That way a file sitting in captured/ across multiple
   *  ticks (because the gate hasn't tripped yet) won't be self-deleted
   *  on the next tick when its own sha appears in the ledger.
   */
  async function runDedup(): Promise<{ kept: number; dropped: number }> {
    const ids = await deps.outbox.list("captured");

    if (ids.length === 0) return { kept: 0, dropped: 0 };

    type Entry = {
      id: string;
      sessionId: string | null;
      contentSha: string;
      uuid: string | null;
    };
    const entries: Entry[] = [];

    for (const id of ids) {
      try {
        const capture = (await deps.outbox.read(id, "captured")) as CaptureBody;
        const sessionId = capture.session_id ?? null;
        const contentSha = await sha256Hex(capture.content);
        const meta = (capture.raw_meta ?? {}) as Record<string, unknown>;
        const uuid = typeof meta.message_uuid === "string" ? meta.message_uuid : null;

        entries.push({ id, sessionId, contentSha, uuid });
      } catch {}
    }

    const ledgers = new Map<string, Set<string>>();
    const seenInTick = new Map<string, Set<string>>();
    let kept = 0;
    let dropped = 0;

    for (const e of entries) {
      if (!e.sessionId) {
        kept++;
        continue;
      }

      let ledger = ledgers.get(e.sessionId);

      if (!ledger) {
        ledger = await loadSessionLedger(e.sessionId);
        ledgers.set(e.sessionId, ledger);
      }

      let tickSeen = seenInTick.get(e.sessionId);

      if (!tickSeen) {
        tickSeen = new Set();
        seenInTick.set(e.sessionId, tickSeen);
      }

      const shaKey = `sha:${e.contentSha}`;
      const uuidKey = e.uuid ? `uuid:${e.uuid}` : null;
      const isDup =
        ledger.has(shaKey) ||
        tickSeen.has(shaKey) ||
        (uuidKey !== null && (ledger.has(uuidKey) || tickSeen.has(uuidKey)));

      if (isDup) {
        try {
          await deps.outbox.delete(e.id, "captured");
        } catch {
          // file vanished; treat as dropped
        }

        dropped++;
        continue;
      }

      tickSeen.add(shaKey);
      if (uuidKey) tickSeen.add(uuidKey);
      kept++;
    }

    if (dropped > 0) {
      Logger.info("dedup", { kept, dropped });
    }

    return { kept, dropped };
  }

  /** Append accepted (extract-completed) shas + uuids to the per-session
   *  ledger. Called from runCoalescedExtract once a file has been
   *  successfully transitioned to observations/. */
  async function recordAcceptedKeys(
    captures: Array<{
      session_id: string | null;
      content: string;
      raw_meta: Record<string, unknown>;
    }>,
  ): Promise<void> {
    const bySession = new Map<string, string[]>();

    for (const c of captures) {
      if (!c.session_id) continue;
      const sha = await sha256Hex(c.content);
      const meta = c.raw_meta ?? {};
      const uuid = typeof meta.message_uuid === "string" ? meta.message_uuid : null;
      const arr = bySession.get(c.session_id) ?? [];

      arr.push(`sha:${sha}`);
      if (uuid) arr.push(`uuid:${uuid}`);
      bySession.set(c.session_id, arr);
    }

    for (const [sessionId, keys] of bySession) {
      await appendLedger(sessionId, keys);
    }
  }

  async function runCoalescedExtract(): Promise<void> {
    const ids = await deps.outbox.list("captured");

    if (ids.length === 0) return;

    // Gate: full enough OR quiet long enough OR oldest is old enough.
    // Defaults are tuned in index.ts.
    const tickNow = now();
    const oldestTs = ids
      .map((id) => {
        const m = id.match(/^(\d+)-/);

        return m ? Number(m[1]) : Infinity;
      })
      .reduce((a, b) => Math.min(a, b), Infinity);

    const isFull = ids.length >= batchFull;
    const isIdle = idleMs > 0 && tickNow - lastCapturedWriteAt >= idleMs;
    const isForced = forceMs > 0 && Number.isFinite(oldestTs) && tickNow - oldestTs >= forceMs;

    if (!isFull && !isIdle && !isForced) {
      return;
    }

    const entries: Array<{ id: string; ts: number; capture: CaptureBody }> = [];

    for (const id of ids) {
      try {
        const capture = (await deps.outbox.read(id, "captured")) as CaptureBody;
        const tsMatch = id.match(/^(\d+)-/);
        const ts = tsMatch ? Number(tsMatch[1]) : 0;

        entries.push({ id, ts, capture });
      } catch {}
    }

    // Earliest first so each batch's seed is the oldest member.
    entries.sort((a, b) => a.ts - b.ts);
    const processed = new Set<string>();

    for (const seed of entries) {
      if (processed.has(seed.id)) continue;

      const batch: typeof entries = [seed];
      let batchBytes = seed.capture.content.length;

      for (const candidate of entries) {
        if (candidate.id === seed.id) continue;
        if (processed.has(candidate.id)) continue;
        if (batch.length >= MAX_BATCH_SIZE) break;
        const sameSession = candidate.capture.session_id === seed.capture.session_id;
        const sameRepo = candidate.capture.repo === seed.capture.repo;
        const samePrivate = candidate.capture.private === seed.capture.private;
        const inWindow = Math.abs(candidate.ts - seed.ts) <= COALESCE_WINDOW_MS;

        if (sameSession && sameRepo && samePrivate && inWindow) {
          // Stop before the combined batch overruns the extract turn (the
          // seed is already in, so this only caps *additional* members).
          if (batchBytes + candidate.capture.content.length > MAX_BATCH_BYTES) break;
          batch.push(candidate);
          batchBytes += candidate.capture.content.length;
        }
      }

      const extractStartedAt = Date.now();

      Logger.info("extract starting", {
        size: batch.length,
        bytes: batchBytes,
        session: seed.capture.session_id ?? null,
        repo: seed.capture.repo ?? null,
      });

      let memories: ExtractedMemory[];

      try {
        memories = await deps.extract(batch.map((e) => e.capture));
        Logger.info("extract finished", {
          size: batch.length,
          observations: memories.length,
          duration_ms: Date.now() - extractStartedAt,
        });
        // Successful extract: clear any retry counter the batch members
        // accumulated from previous transient failures.
        for (const entry of batch) transientRetries.delete(entry.id);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);

        if (asPermanent(err)) {
          // Permanent failure: every member of the batch goes to failed/.
          for (const entry of batch) {
            try {
              await deps.outbox.markFailed(entry.id, "captured", reason);
              processed.add(entry.id);
              transientRetries.delete(entry.id);
            } catch {
              // Don't fail the rest of the batch on a single move error.
            }
          }

          continue;
        }

        // Transient failure: bump per-file counters, escalate any that
        // crossed the budget to failed/, leave the rest in captured/
        // for the next tick. Always log so a sustained failure is
        // visible in stderr long before any escalation fires.
        const exhausted: typeof entries = [];
        const stillRetrying: typeof entries = [];

        for (const entry of batch) {
          const next = (transientRetries.get(entry.id) ?? 0) + 1;

          transientRetries.set(entry.id, next);
          if (next >= maxRetries) exhausted.push(entry);
          else stillRetrying.push(entry);
        }

        Logger.warn("extract batch transient failure", err, {
          size: batch.length,
          retrying: stillRetrying.length,
          exhausted: exhausted.length,
          max_retries: maxRetries,
          session: seed.capture.session_id ?? null,
          repo: seed.capture.repo ?? null,
        });

        for (const entry of exhausted) {
          try {
            await deps.outbox.markFailed(
              entry.id,
              "captured",
              `transient retry budget (${maxRetries}) exhausted: ${reason}`,
            );
            processed.add(entry.id);
            transientRetries.delete(entry.id);
          } catch {
            // best-effort
          }
        }

        continue;
      }

      const transitioned: typeof entries = [];

      for (let i = 0; i < batch.length; i++) {
        const entry = batch[i]!;
        const isSeed = i === 0;

        try {
          await deps.outbox.transition(entry.id, "captured", "observations", {
            capture: entry.capture,
            memories: isSeed ? memories : [],
          });
          processed.add(entry.id);
          transitioned.push(entry);
        } catch (err) {
          if (asPermanent(err)) {
            const reason = err instanceof Error ? err.message : String(err);

            await deps.outbox.markFailed(entry.id, "captured", reason);
          }
        }
      }

      // Now that these captures have made it into observations/, write
      // their dedup keys to the ledger so future ticks (or future
      // sessions) drop dupes of the same content/uuid.
      if (transitioned.length > 0) {
        await recordAcceptedKeys(
          transitioned.map((e) => ({
            session_id: e.capture.session_id ?? null,
            content: e.capture.content,
            raw_meta: (e.capture.raw_meta ?? {}) as Record<string, unknown>,
          })),
        );
      }
    }
  }

  // Stage workers, exposed individually so index.ts can drive each on
  // its own setInterval. Three independent loops let embed and push
  // make progress while extract is mid-Haiku-call (~3-5s per batch on
  // the streaming SDK), without anything blocking anything else.
  //
  // The capture-side tick keeps dedup and extract sequential within
  // ITSELF: dedup must drain the duplicates from captured/ before
  // extract reads the directory, otherwise extract could pick up a
  // file dedup is about to delete. That ordering is local to this
  // tick, not coordinated with the others — embed/push read different
  // directories, so they're naturally independent.

  /** captured/ → observations/. Dedup runs first; then coalesced
   *  extract reads what survived and moves it forward. */
  async function runCaptureTick(): Promise<void> {
    await runDedup();
    await runCoalescedExtract();
  }

  /** observations/ → embedded/. Batched bge across all files in flight. */
  async function runEmbedTick(): Promise<void> {
    await runBatchedEmbed();
  }

  /** embedded/ → server → delete. Parallel pushes, bounded. */
  async function runPushTick(): Promise<void> {
    await runParallelPush();
  }

  /** Run all three stages in sequence. Kept for tests and for /flush
   *  semantics where the caller wants a one-shot drain. Production
   *  uses the three stage ticks above on independent intervals. */
  async function runWorkerTick(): Promise<void> {
    await runCaptureTick();
    await runEmbedTick();
    await runPushTick();
  }

  // Force an immediate extract pass regardless of gating, then run the
  // rest of the pipeline. Called from /flush when a hook event (Stop,
  // PreCompact, SessionEnd) signals a natural session boundary - no
  // need to wait for the idle window if the burst has explicitly
  // ended.
  async function flush(): Promise<void> {
    lastCapturedWriteAt = 0; // makes isIdle true on the next gate check
    await runWorkerTick();
  }

  return {
    handleCapture,
    runWorkerTick,
    runCaptureTick,
    runEmbedTick,
    runPushTick,
    flush,
  };
}

// Re-exported so consumers don't have to know the embedder details to
// stamp matching chunk_ids when constructing bundles directly (rare).
export { EMBEDDER_DIM, EMBEDDER_MODEL };
