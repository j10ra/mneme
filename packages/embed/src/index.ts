// Canonical Mneme embedder — single source of truth for the model and
// its parity-critical options. Both the per-machine daemon (capture +
// plugin search) and the server (connector search) embed through the
// same config defined here, so a stored vector and a query vector can
// never come from divergent models. Bumping any of these re-shapes the
// corpus — see migration discipline around `memories.embedding`.

import type { FeatureExtractionPipeline } from "@xenova/transformers";

/** Canonical model name stamped into `meta.embedding_model` and the
 *  `chunk_id = sha256(content_hash + ":" + EMBEDDER_MODEL)` key. */
export const EMBEDDER_MODEL = "BAAI/bge-small-en-v1.5";

/** Transformers.js mirror of EMBEDDER_MODEL — an implementation detail
 *  of how we run it, not the identity written to the DB. */
export const MODEL_ID = "Xenova/bge-small-en-v1.5";

export const EMBEDDER_DIM = 384;

/** Pooling + normalization the stored corpus was built with. Changing
 *  either invalidates every vector. */
export const EMBED_OPTIONS = { pooling: "mean", normalize: true } as const;

/** Quantized by default — the stored vectors are quantized-model
 *  outputs, so fp32 here would drift cosine. Override only with the
 *  matching corpus (MNEME_EMBED_FULL_PREC=1 on the daemon side). */
export const QUANTIZED = process.env.MNEME_EMBED_FULL_PREC !== "1";

let extractorPromise: Promise<FeatureExtractionPipeline> | undefined;

/** Lazy, process-local feature-extraction pipeline. The first call loads
 *  (and on a cold cache, downloads) the model; subsequent calls reuse it.
 *  `MNEME_EMBED_CACHE_DIR` points transformers.js at the baked-in model
 *  so production never downloads at runtime. */
async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractorPromise) return extractorPromise;

  // Dynamic import so the plugin bundler keeps @xenova/transformers
  // external (it's installed at runtime, never inlined into daemon.js).
  const { pipeline, env } = await import("@xenova/transformers");
  const cacheDir = process.env.MNEME_EMBED_CACHE_DIR;

  if (cacheDir) env.cacheDir = cacheDir;
  env.allowLocalModels = true;

  extractorPromise = pipeline("feature-extraction", MODEL_ID, {
    quantized: QUANTIZED,
  } as never) as unknown as Promise<FeatureExtractionPipeline>;

  return extractorPromise;
}

/** Embed texts → unit-normalized 384-dim vectors. Empty input short-
 *  circuits without loading the model. */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const out = await extractor(texts, EMBED_OPTIONS);

  return out.tolist() as number[][];
}

/** Warm the pipeline ahead of first use — the build step calls this to
 *  bake the model into the image layer. */
export async function prefetch(): Promise<void> {
  await embed(["warm"]);
}
