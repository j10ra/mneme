// Local LLM provider — OpenAI-compatible chat completions endpoint behind a
// Caddy/Cloudflare-tunnel proxy. Today this points at the homelab Ollama
// service running qwen2.5:3b (or whatever LLM_MODEL specifies). Any other
// OpenAI-compat endpoint (vLLM, LiteLLM, llama.cpp server) drops in by just
// pointing LLM_URL at it.

import { Logger, mnemeFn } from "@mneme/core";
import { env } from "../../env.ts";
import { CLUSTER_PROMPT, SYSTEM_PROMPT } from "../prompt.ts";
import {
  type ClusterDistillation,
  type DreamLimits,
  type ExtractLimits,
  KINDS,
  type Observation,
} from "../types.ts";

// LLM_TIMEOUT_MS covers warm 3B at ~11.6 tok/s through the full ~1450-token
// prompt + 500-token generation (~77s expected, ~110s on edge cases). CF
// only cares about gaps between SSE chunks (under its ~100s no-data window),
// not total duration; once generation starts streaming, longer total times
// are fine.

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
    if (!captureText.trim()) return [];

    const resp = await fetch(
      `${env.LLM_URL.replace(/\/$/, "")}/llm/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.LLM_BEARER}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: env.LLM_MODEL,
          temperature: 0.2,
          max_tokens: extractLimits.maxOutputTokens,
          stream: true,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: captureText },
          ],
        }),
        signal: AbortSignal.timeout(env.LLM_TIMEOUT_MS),
      },
    );

    const upstream = resp.headers.get("x-mneme-upstream");
    Logger.info("llm.local.extract: response", {
      status: resp.status,
      upstream,
    });

    if (!resp.ok) {
      const err = cleanErrorBody(await resp.text());
      throw new Error(
        `llm.local extract failed: HTTP ${resp.status} (upstream=${upstream ?? "?"})${err ? `: ${err}` : ""}`,
      );
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

/** Distil a tight cluster of related memory contents into one title +
 *  summary. Used by the dream worker (§6.4). Same streaming SSE shape as
 *  extractObservations; different system prompt and output schema. */
export const distillCluster = mnemeFn(
  "llm.local.distill",
  async (memberContents: string): Promise<ClusterDistillation> => {
    if (!memberContents.trim()) throw new Error("distillCluster: empty input");

    const resp = await fetch(
      `${env.LLM_URL.replace(/\/$/, "")}/llm/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.LLM_BEARER}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: env.LLM_MODEL,
          temperature: dreamLimits.temperature,
          // dream is a 24h batch job, latency doesn't matter and a
          // paragraph-length summary is much more useful at recall time
          // than a terse 1-3 sentence version.
          max_tokens: dreamLimits.maxOutputTokens,
          stream: true,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: CLUSTER_PROMPT },
            { role: "user", content: memberContents },
          ],
        }),
        signal: AbortSignal.timeout(env.LLM_TIMEOUT_MS),
      },
    );

    const upstream = resp.headers.get("x-mneme-upstream");
    Logger.info("llm.local.distill: response", {
      status: resp.status,
      upstream,
    });

    if (!resp.ok) {
      const err = cleanErrorBody(await resp.text());
      throw new Error(
        `llm.local distill failed: HTTP ${resp.status} (upstream=${upstream ?? "?"})${err ? `: ${err}` : ""}`,
      );
    }

    const raw = await consumeStream(resp);
    if (!raw.trim()) throw new Error("llm.local distill: empty response");

    let parsed: { title?: unknown; summary?: unknown };
    try {
      parsed = JSON.parse(raw) as { title?: unknown; summary?: unknown };
    } catch {
      throw new Error(`llm.local distill: bad JSON: ${raw.slice(0, 200)}`);
    }

    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    if (!title || !summary) {
      throw new Error("llm.local distill: missing title or summary");
    }
    return { title, summary };
  },
);

/** Conservative limits for the local path. Constrained primarily by the CF
 *  Tunnel 100s no-data window — Ollama buffers response headers until
 *  prompt-eval finishes, so the silent prompt-eval phase has to fit under
 *  ~100s. On 7B at ~30 tok/s eval rate, 3000 chars (~750 tokens user prompt
 *  + ~500 tok system) ≈ 42s, comfortably inside the wall. */
export const extractLimits: ExtractLimits = {
  maxCharsPerCapture: 1500,
  maxTotalChars: 3000,
  maxSiblings: 10,
  maxOutputTokens: 2048,
};

export const dreamLimits: DreamLimits = {
  maxClusterChars: 4000,
  maxOutputTokens: 1024,
  temperature: 0.2,
};

// Logical model name on the wire — for local this is the Ollama Modelfile
// alias (`mneme-llm`) which resolves to whichever underlying model is
// installed on the answering VM (7B on inference-vm, 3B on homelab-vm).
// To distinguish 7B vs 3B at recall time, cross-reference with the
// X-Mneme-Upstream header logged on each call.
export const extractModel = env.LLM_MODEL;
export const dreamModel = env.LLM_MODEL;
