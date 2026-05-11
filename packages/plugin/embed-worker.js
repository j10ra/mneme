// @bun
var __require = import.meta.require;

// packages/daemon/src/embed-worker.ts
console.log = console.error.bind(console);
var MODEL_ID = "Xenova/bge-large-en-v1.5";
var extractorPromise = null;
async function getExtractor() {
  if (extractorPromise)
    return extractorPromise;
  process.stderr.write(`embed-worker: loading pipeline (${MODEL_ID})
`);
  const t0 = Date.now();
  const { pipeline, env: tfEnv } = await import("@xenova/transformers");
  if (process.env.MNEME_EMBED_FULL_PREC !== "1") {
    tfEnv.useBrowserCache = false;
    tfEnv.allowLocalModels = false;
  }
  extractorPromise = pipeline("feature-extraction", MODEL_ID, { quantized: process.env.MNEME_EMBED_FULL_PREC !== "1" });
  extractorPromise.then(() => {
    process.stderr.write(`embed-worker: pipeline ready (${Date.now() - t0}ms)
`);
  });
  return extractorPromise;
}
async function handleRequest(req) {
  if (!req || !Array.isArray(req.texts))
    return { error: "texts[] required" };
  const texts = req.texts.filter((t) => typeof t === "string");
  if (texts.length === 0)
    return { vectors: [] };
  try {
    const extractor = await getExtractor();
    const out = await extractor(texts, { pooling: "mean", normalize: true });
    return { vectors: out.tolist() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
function writeLine(obj) {
  process.stdout.write(JSON.stringify(obj) + `
`);
}
async function main() {
  const decoder = new TextDecoder;
  let buf = "";
  for await (const chunk of process.stdin) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf(`
`)) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line)
        continue;
      let req;
      try {
        req = JSON.parse(line);
      } catch (err) {
        writeLine({ error: `invalid JSON: ${err.message}` });
        continue;
      }
      const resp = await handleRequest(req);
      writeLine(resp);
    }
  }
  process.exit(0);
}
main().catch((err) => {
  process.stderr.write(`embed-worker fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}
`);
  process.exit(1);
});
