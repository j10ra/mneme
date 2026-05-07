// Daemon runtime — capture handler + worker tick.
//
// This module is the core pipeline, kept free of HTTP / file-watcher
// glue so it's deterministic to test. index.ts wires Bun.serve and
// fs.watch around it.
//
// Pipeline shape (per capture, single-tick path):
//   pending/   raw capture body, scrubbed at handleCapture-time
//   extracted/ { capture, memories[] }   memories carry only the LLM-
//                                        derivable fields at this stage
//   embedded/  { capture, memories[] }   memories now have content_hash,
//                                        chunk_id, embedding, embedding_
//                                        model, meta
//   pushed     POST /api/bundle succeeds; file deleted
//   failed/    permanent error during any stage; file moved with reason
//
// Coalescing rule (matches the original architecture's ±5min session
// window): captures sharing (session_id, repo, private) within ±5
// minutes of the seed are extracted in ONE LLM call, capped at
// MAX_BATCH_SIZE. The seed's bundle carries the LLM-derived memories;
// the other captures in the batch each push their own bundle with
// memories=[] (provenance row only). This matches today's server
// behavior where coalesced extract jobs link memories to the seed
// capture_id and other captures stand alone.

import { Logger } from "@mneme/core";
import { scrub, scrubData } from "@mneme/shared";
import { EMBEDDER_DIM, EMBEDDER_MODEL } from "./embed.ts";
import type { Outbox } from "./outbox.ts";
import type {
  Capture,
  ExtractedMemory,
  Memory,
} from "./agents/types.ts";

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

export type HandleCaptureResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

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
  /** When pending count reaches this, run extract immediately. */
  extractBatchFull?: number;
  /** Wait until pending/ has been quiet for this long before extract. */
  extractIdleMs?: number;
  /** Force extract once the oldest pending capture is older than this. */
  extractForceMs?: number;
  /** Test seam for `now()`. Defaults to Date.now. */
  now?: () => number;
};

const REQUIRED_STRING_FIELDS = ["content", "source", "hostname", "harness"] as const;
const COALESCE_WINDOW_MS = 5 * 60 * 1000;
// Max captures per Haiku call. 20 keeps each extract focused enough
// that observation quality stays high; sessions larger than this
// chunk into multiple back-to-back calls (each ~10s).
const MAX_BATCH_SIZE = 20;

// Defaults for the extract gating window. Production overrides them in
// index.ts (idle=30s, force=5min, batchFull=20). Tests keep the
// aggressive shape so single-capture happy-path assertions still hold.
const DEFAULT_EXTRACT_BATCH_FULL = 1;
const DEFAULT_EXTRACT_IDLE_MS = 0;
const DEFAULT_EXTRACT_FORCE_MS = 0;

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
    err !== null &&
    typeof err === "object" &&
    (err as { permanent?: unknown }).permanent === true
  );
}

export function createRuntime(deps: DaemonDeps) {
  const embedderModel = deps.embedderModel ?? EMBEDDER_MODEL;
  const batchFull = deps.extractBatchFull ?? DEFAULT_EXTRACT_BATCH_FULL;
  const idleMs = deps.extractIdleMs ?? DEFAULT_EXTRACT_IDLE_MS;
  const forceMs = deps.extractForceMs ?? DEFAULT_EXTRACT_FORCE_MS;
  const now = deps.now ?? (() => Date.now());

  // Initialised to 0 so a daemon that boots with backlog drains it
  // immediately rather than waiting idleMs after start. handleCapture
  // resets it to now() on each new pending file.
  let lastPendingWriteAt = 0;

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
    lastPendingWriteAt = now();
    return { ok: true, id };
  }

  // Maximum captures to push concurrently. Server is happy with parallel
  // bundles (idempotent insert, separate transactions). 4 is conservative;
  // can raise once we observe DB / network behavior under burst.
  const PUSH_CONCURRENCY = 4;

  // Cap on total memory texts handed to bge-large in a single call. The
  // model accepts arbitrary-length batches in principle, but very large
  // arrays risk OOM on quantized weights. 64 keeps memory bounded while
  // still ~5x faster than per-file embed for typical drain bursts.
  const EMBED_BATCH_CAP = 64;

  async function runBatchedEmbed(): Promise<void> {
    const ids = await deps.outbox.list("extracted");
    if (ids.length === 0) return;

    type Loaded = {
      id: string;
      capture: CaptureBody;
      memories: ExtractedMemory[];
    };
    const loaded: Loaded[] = [];
    for (const id of ids) {
      try {
        const data = (await deps.outbox.read(id, "extracted")) as {
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
        const flatIdx = origin.findIndex(
          (o) => o.fileIdx === f && o.memIdx === m,
        );
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
        await deps.outbox.transition(file.id, "extracted", "embedded", {
          capture: file.capture,
          memories: enriched,
        });
      } catch (err) {
        if (asPermanent(err)) {
          const reason = err instanceof Error ? err.message : String(err);
          await deps.outbox.markFailed(file.id, "extracted", reason);
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

  async function runCoalescedExtract(): Promise<void> {
    const ids = await deps.outbox.list("pending");
    if (ids.length === 0) return;

    // Gate. Only run extract when one of these holds:
    //   - batch is "full enough" (count >= batchFull)
    //   - pending/ has been quiet for idleMs (no new write since)
    //   - oldest pending file is older than forceMs (latency floor)
    // Production wiring sets batchFull=20, idleMs=30s, forceMs=5min so
    // extract runs roughly every burst-of-activity instead of every tick.
    const tickNow = now();
    const oldestTs = ids
      .map((id) => {
        const m = id.match(/^(\d+)-/);
        return m ? Number(m[1]) : Infinity;
      })
      .reduce((a, b) => Math.min(a, b), Infinity);

    const isFull = ids.length >= batchFull;
    const isIdle = idleMs > 0 && tickNow - lastPendingWriteAt >= idleMs;
    const isForced =
      forceMs > 0 && Number.isFinite(oldestTs) && tickNow - oldestTs >= forceMs;

    if (!isFull && !isIdle && !isForced) {
      // Don't log on every tick to avoid noise. Sentinel return.
      return;
    }

    const entries: Array<{ id: string; ts: number; capture: CaptureBody }> = [];
    for (const id of ids) {
      try {
        const capture = (await deps.outbox.read(id, "pending")) as CaptureBody;
        const tsMatch = id.match(/^(\d+)-/);
        const ts = tsMatch ? Number(tsMatch[1]) : 0;
        entries.push({ id, ts, capture });
      } catch {
        continue; // file vanished mid-tick; next tick retries
      }
    }

    // Earliest first so each batch's seed is the oldest member.
    entries.sort((a, b) => a.ts - b.ts);
    const processed = new Set<string>();

    for (const seed of entries) {
      if (processed.has(seed.id)) continue;

      const batch: typeof entries = [seed];
      for (const candidate of entries) {
        if (candidate.id === seed.id) continue;
        if (processed.has(candidate.id)) continue;
        if (batch.length >= MAX_BATCH_SIZE) break;
        const sameSession =
          candidate.capture.session_id === seed.capture.session_id;
        const sameRepo = candidate.capture.repo === seed.capture.repo;
        const samePrivate = candidate.capture.private === seed.capture.private;
        const inWindow = Math.abs(candidate.ts - seed.ts) <= COALESCE_WINDOW_MS;
        if (sameSession && sameRepo && samePrivate && inWindow) {
          batch.push(candidate);
        }
      }

      Logger.info("extract batch", {
        size: batch.length,
        session: seed.capture.session_id ?? null,
        repo: seed.capture.repo ?? null,
      });

      let memories: ExtractedMemory[];
      try {
        memories = await deps.extract(batch.map((e) => e.capture));
        Logger.info("extract result", {
          observations: memories.length,
          captures: batch.length,
        });
      } catch (err) {
        if (asPermanent(err)) {
          // Permanent failure: every member of the batch goes to failed/.
          const reason = err instanceof Error ? err.message : String(err);
          for (const entry of batch) {
            try {
              await deps.outbox.markFailed(entry.id, "pending", reason);
              processed.add(entry.id);
            } catch {
              // Don't fail the rest of the batch on a single move error.
            }
          }
        }
        // Transient: leave batch in pending for next tick.
        continue;
      }

      for (let i = 0; i < batch.length; i++) {
        const entry = batch[i]!;
        const isSeed = i === 0;
        try {
          await deps.outbox.transition(entry.id, "pending", "extracted", {
            capture: entry.capture,
            memories: isSeed ? memories : [],
          });
          processed.add(entry.id);
        } catch (err) {
          if (asPermanent(err)) {
            const reason = err instanceof Error ? err.message : String(err);
            await deps.outbox.markFailed(entry.id, "pending", reason);
          }
        }
      }
    }
  }

  async function runWorkerTick(): Promise<void> {
    // Stage 1: pending -> extracted (coalesced; one LLM call per session window)
    await runCoalescedExtract();

    // Stage 2: extracted -> embedded
    // Batch embed across files: one ONNX call covers all memories in the
    // current extracted/ snapshot, distributed back per-file. bge-large
    // vectorizes large batches efficiently; serial per-file embed wastes
    // ~5x the wall-clock when there are many files queued.
    await runBatchedEmbed();

    // Stage 3: embedded -> pushed -> deleted
    // Parallel pushes (bounded). Each is independent HTTP; server dedupes
    // by (content_sha256, machine_id) so no contention.
    await runParallelPush();
  }

  // Force an immediate extract pass regardless of gating, then run the
  // rest of the pipeline. Called from /flush when a hook event (Stop,
  // PreCompact, SessionEnd) signals a natural session boundary - no
  // need to wait for the idle window if the burst has explicitly
  // ended.
  async function flush(): Promise<void> {
    lastPendingWriteAt = 0; // makes isIdle true on the next gate check
    await runWorkerTick();
  }

  return { handleCapture, runWorkerTick, flush };
}

// Re-exported so consumers don't have to know the embedder details to
// stamp matching chunk_ids when constructing bundles directly (rare).
export { EMBEDDER_DIM, EMBEDDER_MODEL };
