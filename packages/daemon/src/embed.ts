// In-process embedder.
//
// Loads BAAI/bge-large-en-v1.5 via Transformers.js (ONNX runtime under the
// hood). Phase 1 retires the separate TEI service: each daemon embeds
// in-process. Model auto-downloads to Transformers.js's cache directory
// on first call (~1.3GB, one-time per machine). Subsequent calls are
// in-memory inference.
//
// The pipeline is lazy-initialized and shared across calls so the model
// only loads once per daemon process. Empty input is the fast path that
// never touches the pipeline.

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

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    const { pipeline } = await import("@xenova/transformers");
    pipelinePromise = pipeline(
      "feature-extraction",
      TRANSFORMERS_MODEL_ID,
    ) as unknown as Promise<FeatureExtractionPipeline>;
  }
  return pipelinePromise;
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
