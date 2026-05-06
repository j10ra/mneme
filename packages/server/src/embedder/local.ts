// Local embedder — HuggingFace Text Embeddings Inference (TEI) shape behind
// a Caddy/Cloudflare-tunnel proxy. Today this points at the homelab TEI
// service running BAAI/bge-large-en-v1.5 (1024-dim, drop-in for our pgvector
// schema). Any TEI-compatible endpoint works by changing EMBEDDER_URL.

import { Logger, mnemeFn } from "@mneme/core";

const URL = process.env.EMBEDDER_URL ?? process.env.LLM_URL ?? "";
const BEARER = process.env.EMBEDDER_BEARER ?? process.env.AUTH_BEARER ?? process.env.LLM_BEARER ?? "";

export const EMBEDDER_MODEL = process.env.EMBEDDER_MODEL ?? "BAAI/bge-large-en-v1.5";
export const EMBEDDER_DIM = 1024;

const TIMEOUT_MS = Number(process.env.EMBEDDER_TIMEOUT_MS ?? 30_000);

/** Reduce an upstream error body to a single, log-friendly line. Cloudflare
 *  error pages and other proxy responses come back as multi-line HTML — we
 *  don't want that flooding logs. JSON bodies stay readable. */
function cleanErrorBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  // HTML — strip tags and collapse whitespace.
  if (trimmed.startsWith("<")) {
    const stripped = trimmed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return stripped.slice(0, 200);
  }
  return trimmed.replace(/\s+/g, " ").slice(0, 200);
}

export const embedBatch = mnemeFn(
  "embedder.local.batch",
  async (texts: string[]): Promise<number[][]> => {
    if (texts.length === 0) return [];
    if (!URL) throw new Error("EMBEDDER_URL (or LLM_URL) not set");
    if (!BEARER) throw new Error("EMBEDDER_BEARER (or AUTH_BEARER) not set");

    const resp = await fetch(`${URL.replace(/\/$/, "")}/embed/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BEARER}`,
      },
      body: JSON.stringify({ inputs: texts }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    Logger.info("embedder.local.batch: response", {
      status: resp.status,
      n: texts.length,
      upstream: resp.headers.get("x-mneme-upstream"),
    });

    if (!resp.ok) {
      const err = cleanErrorBody(await resp.text());
      throw new Error(`embedder.local failed: HTTP ${resp.status}${err ? `: ${err}` : ""}`);
    }

    const vecs = (await resp.json()) as unknown;
    if (!Array.isArray(vecs)) {
      throw new Error("embedder.local: response is not an array");
    }
    if (vecs.length !== texts.length) {
      throw new Error(
        `embedder.local: got ${vecs.length} vectors, want ${texts.length}`,
      );
    }
    const first = vecs[0];
    if (!Array.isArray(first) || first.length !== EMBEDDER_DIM) {
      throw new Error(
        `embedder.local: got ${Array.isArray(first) ? first.length : "non-array"} dims, want ${EMBEDDER_DIM}`,
      );
    }
    return vecs as number[][];
  },
);

export const embedText = mnemeFn(
  "embedder.local.one",
  async (text: string): Promise<number[]> => {
    const r = await embedBatch([text]);
    return r[0]!;
  },
);
