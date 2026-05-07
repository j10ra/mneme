// In-process embedder.
//
// Loads BAAI/bge-large-en-v1.5 via Transformers.js (ONNX runtime under the
// hood). Phase 1 retires the separate TEI service: each daemon embeds
// in-process. Model auto-downloads to Transformers.js's cache directory
// on first call (~1.3GB, one-time per machine). Subsequent calls are
// in-memory inference.
//
// The pipeline is lazy-initialized and shared across calls. After
// PIPELINE_IDLE_MS without an embed, disposeIfIdle() can be called from
// the daemon's tick to release the ONNX session and free RAM. Next
// call reloads it transparently. This is the "laptops stop sweating"
// lever: the heaviest object in the daemon's memory only lives during
// active use.

import { Logger } from "@mneme/core";

// `BAAI/bge-large-en-v1.5` is the canonical model name we record in
// `meta.embedding_model` and use in `chunk_id = sha256(content_hash + ":"
// + EMBEDDER_MODEL)`. Transformers.js fetches an ONNX-converted mirror at
// `Xenova/bge-large-en-v1.5`; the mirror is an implementation detail of
// the runtime, not part of the schema.
export const EMBEDDER_MODEL = "BAAI/bge-large-en-v1.5";
const TRANSFORMERS_MODEL_ID = "Xenova/bge-large-en-v1.5";
export const EMBEDDER_DIM = 1024;

type FeatureExtractionPipeline = (
  texts: string | string[],
  options?: { pooling?: "mean" | "cls"; normalize?: boolean },
) => Promise<{ tolist(): number[][] | number[][][]; data: Float32Array; dims: number[] }>;

// Idle window after which disposeIfIdle() will release the loaded
// pipeline. Tuned so a brief gap between bursts (e.g. user switches
// windows for a minute) keeps the model warm, but a longer gap (idle
// laptop, between coding sessions) reclaims the ~500MB.
const PIPELINE_IDLE_MS = 5 * 60 * 1000;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;
let lastUsedAt = 0;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    Logger.info("embedder: loading pipeline", { model: EMBEDDER_MODEL });
    const { pipeline, env: tfEnv } = await import("@xenova/transformers");
    // Default to int8-quantized weights. bge-large-en-v1.5 quantized
    // is ~3-4x lighter on RAM and noticeably faster on CPU than the
    // full-precision ONNX, with negligible quality drop for our use
    // (cosine search of 1024-dim vectors). Set MNEME_EMBED_FULL_PREC=1
    // to opt back into full precision.
    if (process.env.MNEME_EMBED_FULL_PREC !== "1") {
      tfEnv.useBrowserCache = false;
      tfEnv.allowLocalModels = false;
    }
    pipelinePromise = pipeline(
      "feature-extraction",
      TRANSFORMERS_MODEL_ID,
      {
        quantized: process.env.MNEME_EMBED_FULL_PREC !== "1",
      } as never,
    ) as unknown as Promise<FeatureExtractionPipeline>;
  }
  lastUsedAt = Date.now();
  return pipelinePromise;
}

// Drop the loaded pipeline if it has been idle long enough. Returns
// true if it actually disposed something. Called from the daemon tick.
// Safe to call when no pipeline is loaded (no-op).
export async function disposeIfIdle(
  idleMs: number = PIPELINE_IDLE_MS,
): Promise<boolean> {
  if (!pipelinePromise) return false;
  if (Date.now() - lastUsedAt < idleMs) return false;

  Logger.info("embedder: disposing idle pipeline", {
    idle_seconds: Math.round((Date.now() - lastUsedAt) / 1000),
  });
  try {
    const p = await pipelinePromise;
    const dispose = (p as { dispose?: () => Promise<void> | void }).dispose;
    if (typeof dispose === "function") {
      await dispose.call(p);
    }
  } catch (err) {
    Logger.warn(
      "embedder: pipeline.dispose threw, dropping reference anyway",
      { err: err instanceof Error ? err.message : String(err) },
    );
  }
  pipelinePromise = null;
  // Native ONNX session memory is held in C++; V8's GC can't reach
  // it. dispose() above is supposed to release it. Bun.gc(true) cleans
  // up the JS-side handles so the reference graph collapses fully.
  if (typeof Bun !== "undefined" && Bun.gc) Bun.gc(true);
  return true;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getPipeline();
  const output = await extractor(texts, { pooling: "mean", normalize: true });

  // Transformers.js returns a Tensor whose .tolist() shape depends on input
  // arity. For an array of strings the result is number[][] (batch × dim);
  // for a single string it's number[] (dim only). We always pass an array,
  // so the cast to number[][] is safe.
  const flat = output.tolist();
  return flat as number[][];
}
