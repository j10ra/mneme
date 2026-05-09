// OpenRouter LLM provider — OpenAI-compatible chat completions at
// openrouter.ai/api/v1. Used as the primary LLM path for extract + dream
// when OPENROUTER_API_KEY is set; the local provider takes over when the
// per-provider circuit breaker (see pick.ts) trips.
//
// Two model envs because extract (hot path, structured JSON) and dream
// (background, synthesis) often want different models — typical pairing
// is qwen/qwen-2.5-72b-instruct for extract and anthropic/claude-sonnet-4
// for dream. Both target the same wire-shape (OpenAI-compat SSE) so the
// picker dispatches to the same provider with different per-call config.
//
// Note on response_format: Qwen models honour {type: "json_object"}
// natively; Anthropic models don't have that flag in their API but
// OpenRouter layers prompt-engineered JSON coercion on top, and our
// SYSTEM_PROMPT / CLUSTER_PROMPT explicitly request JSON anyway, so we
// pass response_format on every call and trust OpenRouter to handle
// per-model differences.

import { Logger, mnemeFn } from "@mneme/core";
import { env } from "../../infra/env.ts";
import {
  CLUSTER_MERGE_PROMPT,
  CLUSTER_PROMPT,
  SUPERSEDE_PROMPT,
  SYSTEM_PROMPT,
} from "../prompt.ts";
import {
  type ClusterDistillation,
  type ClusterMergeJudgment,
  type ClusterSummary,
  type DreamLimits,
  type ExtractLimits,
  KINDS,
  type Observation,
  type SupersedeCandidate,
  type SupersedePair,
} from "../types.ts";

const URL = "https://openrouter.ai/api/v1/chat/completions";

// Optional attribution for OpenRouter's dashboard. Sent on every request
// so spend / latency / model usage shows up under a stable app label.
const REFERER = "https://github.com/j10ra/mneme";
const APP_TITLE = "Mneme";

type StreamChunk = {
  choices?: Array<{ delta?: { content?: string } }>;
};

function cleanErrorBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<")) {
    const stripped = trimmed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return stripped.slice(0, 200);
  }
  return trimmed.replace(/\s+/g, " ").slice(0, 200);
}

async function consumeStream(resp: Response): Promise<string> {
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("llm.openrouter: response body not readable");
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
        // OpenRouter occasionally injects keep-alive comment frames; skip.
      }
    }
  }
  return out;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.OPENROUTER_API_KEY ?? ""}`,
    Accept: "text/event-stream",
    "HTTP-Referer": REFERER,
    "X-Title": APP_TITLE,
  };
}

export const extractObservations = mnemeFn(
  "llm.openrouter.extract",
  async (captureText: string): Promise<Observation[]> => {
    if (!env.HAS_OPENROUTER) throw new Error("OPENROUTER_API_KEY not set");
    if (!captureText.trim()) return [];

    const resp = await fetch(URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model: env.OPENROUTER_EXTRACT_MODEL,
        temperature: 0.2,
        max_tokens: extractLimits.maxOutputTokens,
        stream: true,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: captureText },
        ],
      }),
      signal: AbortSignal.timeout(env.OPENROUTER_TIMEOUT_MS),
    });

    Logger.info("llm.openrouter.extract: response", {
      status: resp.status,
      model: env.OPENROUTER_EXTRACT_MODEL,
    });

    if (!resp.ok) {
      const err = cleanErrorBody(await resp.text());
      throw new Error(
        `llm.openrouter extract failed: HTTP ${resp.status}${err ? `: ${err}` : ""}`,
      );
    }

    const raw = await consumeStream(resp);
    if (!raw.trim()) throw new Error("llm.openrouter extract: empty response");

    let parsed: { observations?: unknown };
    try {
      parsed = JSON.parse(raw) as { observations?: unknown };
    } catch {
      throw new Error(`llm.openrouter extract: bad JSON: ${raw.slice(0, 200)}`);
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

export const distillCluster = mnemeFn(
  "llm.openrouter.distill",
  async (memberContents: string): Promise<ClusterDistillation> => {
    if (!env.HAS_OPENROUTER) throw new Error("OPENROUTER_API_KEY not set");
    if (!memberContents.trim()) throw new Error("distillCluster: empty input");

    const resp = await fetch(URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model: env.OPENROUTER_DREAM_MODEL,
        temperature: dreamLimits.temperature,
        max_tokens: dreamLimits.maxOutputTokens,
        stream: true,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CLUSTER_PROMPT },
          { role: "user", content: memberContents },
        ],
      }),
      signal: AbortSignal.timeout(env.OPENROUTER_TIMEOUT_MS),
    });

    Logger.info("llm.openrouter.distill: response", {
      status: resp.status,
      model: env.OPENROUTER_DREAM_MODEL,
    });

    if (!resp.ok) {
      const err = cleanErrorBody(await resp.text());
      throw new Error(
        `llm.openrouter distill failed: HTTP ${resp.status}${err ? `: ${err}` : ""}`,
      );
    }

    const raw = await consumeStream(resp);
    if (!raw.trim()) throw new Error("llm.openrouter distill: empty response");

    let parsed: { title?: unknown; summary?: unknown };
    try {
      parsed = JSON.parse(raw) as { title?: unknown; summary?: unknown };
    } catch {
      throw new Error(
        `llm.openrouter distill: bad JSON: ${raw.slice(0, 200)}`,
      );
    }

    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const summary =
      typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    if (!title || !summary) {
      throw new Error("llm.openrouter distill: missing title or summary");
    }
    return { title, summary };
  },
);

/** Generous limits for the cloud path — no CF Tunnel in the way, prompt-eval
 *  is sub-second on hosted infra, and 72B / Sonnet handle large prompts
 *  well. Hot path can absorb ~10k-char extract prompts without quality
 *  loss; dream is a background batch job that benefits from rich cluster
 *  context. Real ceiling here is provider context windows (128K+ on both
 *  default models), so these values are well inside the budget. */
export const extractLimits: ExtractLimits = {
  maxCharsPerCapture: 2500,
  maxTotalChars: 10000,
  maxSiblings: 30,
  maxOutputTokens: 4096,
};

export const dreamLimits: DreamLimits = {
  maxClusterChars: 40000,
  maxOutputTokens: 4096,
  temperature: 0.3,
};

// Recorded into memories.meta.extractor_model / distiller_model so each
// memory carries the model that wrote it. Picks up env overrides so a
// model swap (e.g. Sonnet 4 → GPT-5) is reflected without a code change.
export const extractModel = env.OPENROUTER_EXTRACT_MODEL;
export const dreamModel = env.OPENROUTER_DREAM_MODEL;

/** Cloud-only supersede detection. Same wire shape as distillCluster
 *  (SSE, json_object) but a different prompt + simpler validation.
 *  Caller in dream.ts validates returned pairs against the candidate
 *  set and the chronology check; this function trusts the JSON arrived. */
export const findSupersedes = mnemeFn(
  "llm.openrouter.supersede",
  async (candidates: SupersedeCandidate[]): Promise<SupersedePair[]> => {
    if (!env.HAS_OPENROUTER) throw new Error("OPENROUTER_API_KEY not set");
    if (candidates.length < 2) return [];

    const userBody = candidates
      .map(
        (c) =>
          `id: ${c.id}\nkind: ${c.kind}\ncreated_at: ${c.created_at}\ncontent: ${c.content}`,
      )
      .join("\n\n---\n\n");

    const resp = await fetch(URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model: env.OPENROUTER_DREAM_MODEL,
        // Tighter than distill — supersede should be conservative;
        // creative reasoning here would invent contradictions.
        temperature: 0.1,
        // Pairs JSON is small. 1024 is plenty.
        max_tokens: 1024,
        stream: true,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SUPERSEDE_PROMPT },
          { role: "user", content: userBody },
        ],
      }),
      signal: AbortSignal.timeout(env.OPENROUTER_TIMEOUT_MS),
    });

    Logger.info("llm.openrouter.supersede: response", {
      status: resp.status,
      candidates: candidates.length,
      model: env.OPENROUTER_DREAM_MODEL,
    });

    if (!resp.ok) {
      const err = cleanErrorBody(await resp.text());
      throw new Error(
        `llm.openrouter supersede failed: HTTP ${resp.status}${err ? `: ${err}` : ""}`,
      );
    }

    const raw = await consumeStream(resp);
    if (!raw.trim()) return [];

    let parsed: { pairs?: unknown };
    try {
      parsed = JSON.parse(raw) as { pairs?: unknown };
    } catch {
      throw new Error(
        `llm.openrouter supersede: bad JSON: ${raw.slice(0, 200)}`,
      );
    }

    const pairs = parsed.pairs;
    if (!Array.isArray(pairs)) return [];
    return pairs.filter(
      (p: unknown): p is SupersedePair =>
        !!p &&
        typeof p === "object" &&
        typeof (p as SupersedePair).old_id === "string" &&
        typeof (p as SupersedePair).new_id === "string" &&
        typeof (p as SupersedePair).reason === "string",
    );
  },
);

/** Cluster-merge judgment for the digest worker (#30). Same wire
 *  shape as distillCluster + findSupersedes (SSE, json_object, low
 *  temperature). Caller in worker/digest.ts
 *  decides identity (winner = higher importance) — this function only
 *  judges whether the two summaries describe the same topic. */
export const judgeClusterMerge = mnemeFn(
  "llm.openrouter.merge",
  async (
    a: ClusterSummary,
    b: ClusterSummary,
  ): Promise<ClusterMergeJudgment> => {
    if (!env.HAS_OPENROUTER) throw new Error("OPENROUTER_API_KEY not set");

    const userBody = `CLUSTER A\ntitle: ${a.title}\nsummary: ${a.summary}\n\n---\n\nCLUSTER B\ntitle: ${b.title}\nsummary: ${b.summary}`;

    const resp = await fetch(URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model: env.OPENROUTER_DREAM_MODEL,
        // Same low-creativity setting as supersede — we want
        // conservative judgment, not invention.
        temperature: 0.1,
        max_tokens: 256,
        stream: true,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CLUSTER_MERGE_PROMPT },
          { role: "user", content: userBody },
        ],
      }),
      signal: AbortSignal.timeout(env.OPENROUTER_TIMEOUT_MS),
    });

    Logger.info("llm.openrouter.merge: response", {
      status: resp.status,
      model: env.OPENROUTER_DREAM_MODEL,
    });

    if (!resp.ok) {
      const err = cleanErrorBody(await resp.text());
      throw new Error(
        `llm.openrouter merge failed: HTTP ${resp.status}${err ? `: ${err}` : ""}`,
      );
    }

    const raw = await consumeStream(resp);
    if (!raw.trim()) throw new Error("llm.openrouter merge: empty response");

    let parsed: { same_topic?: unknown; reason?: unknown };
    try {
      parsed = JSON.parse(raw) as { same_topic?: unknown; reason?: unknown };
    } catch {
      throw new Error(`llm.openrouter merge: bad JSON: ${raw.slice(0, 200)}`);
    }

    if (typeof parsed.same_topic !== "boolean") {
      throw new Error("llm.openrouter merge: missing same_topic");
    }
    return {
      same_topic: parsed.same_topic,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  },
);
