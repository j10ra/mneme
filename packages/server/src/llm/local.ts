// Local LLM provider — OpenAI-compatible chat completions endpoint behind a
// Caddy/Cloudflare-tunnel proxy. Today this points at the homelab Ollama
// service running qwen2.5:7b (or whatever LLM_MODEL specifies). Any other
// OpenAI-compat endpoint (vLLM, LiteLLM, llama.cpp server) drops in by just
// pointing LLM_URL at it.

import { mnemeFn } from "@mneme/core";
import { SYSTEM_PROMPT } from "./prompt.ts";
import { KINDS, type Observation } from "./types.ts";

const URL = process.env.LLM_URL ?? "";
const BEARER = process.env.LLM_BEARER ?? process.env.AUTH_BEARER ?? "";
const MODEL = process.env.LLM_MODEL ?? "qwen2.5:7b-instruct-q4_K_M";
// 90s — slightly under Cloudflare's 100s "no data from origin" window. A real
// warm extract on qwen2.5:7b finishes in 5-30s; cold-load failures get
// cancelled fast instead of holding the homelab CPU for 2+ minutes.
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 90_000);

type StreamChunk = {
  choices?: Array<{ delta?: { content?: string } }>;
};

/** Reduce an upstream error body to a single, log-friendly line. Cloudflare
 *  error pages and other proxy responses come back as multi-line HTML — we
 *  don't want that flooding logs. JSON bodies stay readable. */
function cleanErrorBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<")) {
    const stripped = trimmed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return stripped.slice(0, 200);
  }
  return trimmed.replace(/\s+/g, " ").slice(0, 200);
}

/** Read an SSE stream of OpenAI chat completion chunks and return the
 *  concatenated assistant text. Streaming is required for slow local models
 *  behind Cloudflare/proxies — without it, idle timeouts (HTTP 524) kill
 *  generations that exceed the proxy's idle window (~100s on free CF). */
async function consumeStream(resp: Response): Promise<string> {
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("llm.local: response body not readable");
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return out;
      try {
        const chunk = JSON.parse(payload) as StreamChunk;
        const piece = chunk.choices?.[0]?.delta?.content;
        if (piece) out += piece;
      } catch {
        // Skip malformed chunk; OpenAI streams occasionally include keep-alives.
      }
    }
  }
  return out;
}

export const extractObservations = mnemeFn(
  "llm.local.extract",
  async (captureText: string): Promise<Observation[]> => {
    if (!URL) throw new Error("LLM_URL not set");
    if (!BEARER) throw new Error("LLM_BEARER (or AUTH_BEARER) not set");
    if (!captureText.trim()) return [];

    const resp = await fetch(`${URL.replace(/\/$/, "")}/llm/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BEARER}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 2048,
        stream: true,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: captureText },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!resp.ok) {
      const err = cleanErrorBody(await resp.text());
      throw new Error(`llm.local extract failed: HTTP ${resp.status}${err ? `: ${err}` : ""}`);
    }

    const raw = await consumeStream(resp);
    if (!raw.trim()) throw new Error("llm.local extract: empty response");

    let parsed: { observations?: unknown };
    try {
      parsed = JSON.parse(raw) as { observations?: unknown };
    } catch {
      throw new Error(`llm.local extract: bad JSON: ${raw.slice(0, 200)}`);
    }

    const obs = parsed.observations;
    if (!Array.isArray(obs)) return [];
    return obs.filter(
      (o: unknown): o is Observation =>
        !!o &&
        typeof o === "object" &&
        typeof (o as Observation).content === "string" &&
        (o as Observation).content.trim().length > 0 &&
        (KINDS as readonly string[]).includes((o as Observation).kind),
    );
  },
);
