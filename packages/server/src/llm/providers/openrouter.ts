// OpenRouter LLM provider — OpenAI-compatible chat completions at
// openrouter.ai/api/v1. The server's only LLM surface is digest's two
// judgments: findSupersedes (Op2 cross-cluster supersede) and
// judgeClusterMerge (Op1 cluster merge). Both run against
// OPENROUTER_DIGEST_MODEL (typically anthropic/claude-sonnet-4).
//
// Note on response_format: Anthropic models don't have a json_object
// flag in their native API, but OpenRouter layers prompt-engineered
// JSON coercion on top and our SUPERSEDE_PROMPT / CLUSTER_MERGE_PROMPT
// explicitly request JSON. We pass response_format on every call.

import { Logger, mnemeFn } from "@mneme/core";
import { env } from "../../infra/env.ts";
import { CLUSTER_MERGE_PROMPT, SUPERSEDE_PROMPT } from "../prompt.ts";
import type {
  ClusterMergeJudgment,
  ClusterSummary,
  DigestLimits,
  SupersedeCandidate,
  SupersedePair,
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
    const stripped = trimmed
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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

/** Generous limits for the cloud path — Sonnet handles large prompts
 *  well and digest is a background batch job that benefits from rich
 *  cluster context. Real ceiling is the provider context window
 *  (~200K on Sonnet 4), so these values are well inside the budget. */
export const digestLimits: DigestLimits = {
  maxClusterChars: 40000,
  maxOutputTokens: 4096,
  temperature: 0.3,
};

// Recorded into memories.meta.distiller_model so each digest-touched
// cluster carries the model that judged it. Picks up env overrides so
// a model swap (e.g. Sonnet 4 → GPT-5) is reflected without a code change.
export const digestModel = env.OPENROUTER_DIGEST_MODEL;

/** Cross-cluster supersede detection (digest Op2). SSE + json_object
 *  wire shape; the caller in worker/digest.ts validates returned pairs
 *  against the candidate set and the chronology check before applying,
 *  so this function trusts that the JSON arrived intact. */
export const findSupersedes = mnemeFn(
  "llm.openrouter.supersede",
  async (candidates: SupersedeCandidate[]): Promise<SupersedePair[]> => {
    if (!env.HAS_OPENROUTER) throw new Error("OPENROUTER_API_KEY not set");
    if (candidates.length < 2) return [];

    const userBody = candidates
      .map(
        (c) => `id: ${c.id}\nkind: ${c.kind}\ncreated_at: ${c.created_at}\ncontent: ${c.content}`,
      )
      .join("\n\n---\n\n");

    const resp = await fetch(URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model: env.OPENROUTER_DIGEST_MODEL,
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
      model: env.OPENROUTER_DIGEST_MODEL,
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
      throw new Error(`llm.openrouter supersede: bad JSON: ${raw.slice(0, 200)}`);
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
  async (a: ClusterSummary, b: ClusterSummary): Promise<ClusterMergeJudgment> => {
    if (!env.HAS_OPENROUTER) throw new Error("OPENROUTER_API_KEY not set");

    const userBody = `CLUSTER A\ntitle: ${a.title}\nsummary: ${a.summary}\n\n---\n\nCLUSTER B\ntitle: ${b.title}\nsummary: ${b.summary}`;

    const resp = await fetch(URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model: env.OPENROUTER_DIGEST_MODEL,
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
      model: env.OPENROUTER_DIGEST_MODEL,
    });

    if (!resp.ok) {
      const err = cleanErrorBody(await resp.text());

      throw new Error(`llm.openrouter merge failed: HTTP ${resp.status}${err ? `: ${err}` : ""}`);
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
