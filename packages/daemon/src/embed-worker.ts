// Embedder subprocess.
//
// Spawned lazily by `packages/daemon/src/embed.ts`. Lives in its own
// process so the ONNX session's heap growth never fragments the
// daemon's address space. When this process exits, the OS reclaims
// everything (no MALLOC_LARGE creep).
//
// Protocol (JSON-lines):
//   stdin:  { "texts": ["...", ...] }
//   stdout: { "vectors": [[...], ...] } or { "error": "..." }
//   stderr: free for logs (parent inherits)
//
// Exits cleanly on stdin EOF (parent closing the pipe is the
// canonical shutdown signal; SIGTERM works too).

// Defensive: anything inside transformers.js / onnxruntime that calls
// console.log would corrupt the JSON-lines protocol on stdout. Route
// it to stderr where the daemon picks it up as plain log text.
console.log = console.error.bind(console);

const MODEL_ID = "Xenova/bge-small-en-v1.5";

type FeatureExtractionPipeline = (
  texts: string | string[],
  options?: { pooling?: "mean" | "cls"; normalize?: boolean },
) => Promise<{
  tolist(): number[][] | number[][][];
  data: Float32Array;
  dims: number[];
}>;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractorPromise) return extractorPromise;
  process.stderr.write(`embed-worker: loading pipeline (${MODEL_ID})\n`);
  const t0 = Date.now();
  const { pipeline, env: tfEnv } = await import("@xenova/transformers");
  if (process.env.MNEME_EMBED_FULL_PREC !== "1") {
    tfEnv.useBrowserCache = false;
    tfEnv.allowLocalModels = false;
  }
  extractorPromise = pipeline("feature-extraction", MODEL_ID, {
    quantized: process.env.MNEME_EMBED_FULL_PREC !== "1",
  } as never) as unknown as Promise<FeatureExtractionPipeline>;
  void extractorPromise.then(() => {
    process.stderr.write(`embed-worker: pipeline ready (${Date.now() - t0}ms)\n`);
  });
  return extractorPromise;
}

async function handleRequest(req: {
  texts?: unknown;
}): Promise<{ vectors: number[][] } | { error: string }> {
  if (!req || !Array.isArray(req.texts)) return { error: "texts[] required" };
  const texts = req.texts.filter((t): t is string => typeof t === "string");
  if (texts.length === 0) return { vectors: [] };
  try {
    const extractor = await getExtractor();
    const out = await extractor(texts, { pooling: "mean", normalize: true });
    return { vectors: out.tolist() as number[][] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function writeLine(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

async function main(): Promise<void> {
  const decoder = new TextDecoder();
  let buf = "";
  for await (const chunk of process.stdin) {
    buf += decoder.decode(chunk as Uint8Array, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let req: unknown;
      try {
        req = JSON.parse(line);
      } catch (err) {
        writeLine({ error: `invalid JSON: ${(err as Error).message}` });
        continue;
      }
      const resp = await handleRequest(req as { texts?: unknown });
      writeLine(resp);
    }
  }
  // stdin closed = parent gone. Exit so OS reclaims everything.
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(
    `embed-worker fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
