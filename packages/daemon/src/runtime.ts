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

import { scrub, scrubData } from "@mneme/shared";
import { EMBEDDER_DIM, EMBEDDER_MODEL } from "./embed.ts";
import type { Outbox, OutboxState } from "./outbox.ts";
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
};

const REQUIRED_STRING_FIELDS = ["content", "source", "hostname", "harness"] as const;
const COALESCE_WINDOW_MS = 5 * 60 * 1000;
const MAX_BATCH_SIZE = 30;

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
    return { ok: true, id };
  }

  // Process one stage's worth of work; called once per stage in tick order.
  async function processStage(
    state: OutboxState,
    handler: (id: string, data: unknown) => Promise<void>,
  ): Promise<void> {
    const ids = await deps.outbox.list(state);
    for (const id of ids) {
      let data: unknown;
      try {
        data = await deps.outbox.read(id, state);
      } catch {
        continue; // file vanished mid-tick; next tick will retry
      }
      try {
        await handler(id, data);
      } catch (err) {
        if (asPermanent(err)) {
          const reason = err instanceof Error ? err.message : String(err);
          await deps.outbox.markFailed(id, state, reason);
        }
        // Transient error: leave file in current state for the next tick.
      }
    }
  }

  async function runCoalescedExtract(): Promise<void> {
    const ids = await deps.outbox.list("pending");
    if (ids.length === 0) return;

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

      let memories: ExtractedMemory[];
      try {
        memories = await deps.extract(batch.map((e) => e.capture));
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
    await processStage("extracted", async (id, data) => {
      const stage = data as { capture: CaptureBody; memories: ExtractedMemory[] };
      const vectors = stage.memories.length
        ? await deps.embed(stage.memories.map((m) => m.content))
        : [];

      const enriched: Memory[] = [];
      for (let i = 0; i < stage.memories.length; i++) {
        const m = stage.memories[i]!;
        const contentHash = await sha256Hex(m.content);
        const chunkId = await sha256Hex(`${contentHash}:${embedderModel}`);
        enriched.push({
          ...m,
          content_hash: contentHash,
          chunk_id: chunkId,
          embedding: vectors[i],
          embedding_model: embedderModel,
          meta: {
            extractor_provider: "anthropic",
            extractor_model: "claude-code",
          },
        });
      }

      await deps.outbox.transition(id, "extracted", "embedded", {
        capture: stage.capture,
        memories: enriched,
      });
    });

    // Stage 3: embedded -> pushed -> deleted
    await processStage("embedded", async (id, data) => {
      const stage = data as { capture: CaptureBody; memories: Memory[] };
      const captureSha = await sha256Hex(stage.capture.content);
      const bundle: Bundle = {
        capture: { ...stage.capture, content_sha256: captureSha },
        memories: stage.memories,
      };
      await deps.push(bundle);
      await deps.outbox.delete(id, "embedded");
      console.log(
        `[mneme-daemon] pushed bundle id=${id} memories=${stage.memories.length}`,
      );
    });
  }

  return { handleCapture, runWorkerTick };
}

// Re-exported so consumers don't have to know the embedder details to
// stamp matching chunk_ids when constructing bundles directly (rare).
export { EMBEDDER_DIM, EMBEDDER_MODEL };
