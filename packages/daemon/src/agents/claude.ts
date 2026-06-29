// Claude provider.
//
// Uses @anthropic-ai/claude-agent-sdk's `query()` with
// pathToClaudeCodeExecutable pointing at the local `claude` binary.
// Auth resolution is delegated entirely to the SDK, which checks (in
// priority order):
//   1. ANTHROPIC_API_KEY  — pay-per-token, no Keychain access
//   2. CLAUDE_CODE_OAUTH_TOKEN  — long-lived SDK token from `claude setup-token`
//   3. Logged-in `claude` CLI session — platform-native store (macOS
//      Keychain, Windows Credential Manager, Linux/WSL ~/.claude/.credentials.json)
//
// We never read those stores ourselves. detectAuthMode() inspects env
// vars only, for `mneme agent list` status display.

import { streamingCallClaude } from "./claude-streaming.ts";
import { CLUSTER_PROMPT, SUPERSEDE_PROMPT, SYSTEM_PROMPT } from "./prompts.ts";
import type {
  AgentProvider,
  AvailabilityStatus,
  Capture,
  DreamOutput,
  ExtractedMemory,
  Memory,
  SupersedeCandidate,
  SupersedePair,
} from "./types.ts";

const VALID_KINDS = new Set([
  "bugfix",
  "feature",
  "discovery",
  "decision",
  "preference",
  "constraint",
  "security_alert",
  "reference",
  "summary",
  "note",
]);

export type AuthMode = "api-key" | "oauth-token" | "claude-code";

/** Status-display only. The SDK does the real auth resolution; this
 *  just reports which env var (if any) is set so `mneme agent list`
 *  shows the user what path the SDK will pick. "claude-code" means
 *  neither env var is set and the SDK will fall through to the active
 *  `claude` CLI session. */
export function detectAuthMode(): AuthMode {
  if (process.env.ANTHROPIC_API_KEY) return "api-key";
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return "oauth-token";

  return "claude-code";
}

// User-message builders. The system prompt is passed separately to the
// SDK so it replaces Claude Code's default coding-assistant preset
// (which would otherwise override our JSON-output instructions).

export function buildExtractPrompt(captures: Capture[]): string {
  const blocks = captures
    .map((c, i) => {
      const header = [
        `Capture ${i + 1}:`,
        c.repo ? `repo: ${c.repo}` : null,
        c.session_id ? `session: ${c.session_id}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      return `${header}\n${c.content}`;
    })
    .join("\n\n---\n\n");

  return `Extract observations from the following captures.\n\n${blocks}\n\nReturn JSON only.`;
}

export function buildClusterPrompt(memories: Memory[]): string {
  const lines = memories.map((m, i) => `${i + 1}. (${m.kind}) ${m.content}`);

  return `Distill the following cluster of related memories.\n\n${lines.join("\n")}\n\nReturn JSON only.`;
}

export function buildSupersedePrompt(candidates: SupersedeCandidate[]): string {
  const lines = candidates.map(
    (m) => `id=${m.id} kind=${m.kind} created_at=${m.created_at}: ${m.content}`,
  );

  return `Review the following memories for supersede relationships.\n\n${lines.join("\n")}\n\nReturn JSON only.`;
}

export function parseSupersedeResponse(text: string): SupersedePair[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonBlock(text));
  } catch {
    return [];
  }

  const pairs = (parsed as { pairs?: unknown }).pairs;

  if (!Array.isArray(pairs)) return [];

  const result: SupersedePair[] = [];

  for (const raw of pairs) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    if (
      typeof r.old_id !== "string" ||
      typeof r.new_id !== "string" ||
      typeof r.reason !== "string"
    ) {
      continue;
    }

    if (r.old_id === r.new_id) continue;
    result.push({
      old_id: r.old_id,
      new_id: r.new_id,
      reason: r.reason,
    });
  }

  return result;
}

// Pull a JSON object out of model output that may contain (in any order):
//   - a ```json ... ``` fenced block
//   - prose explanation after (or before) the JSON
//   - just the bare object
// Strategy: prefer the first fenced block; if no fence, scan for the
// first balanced { ... } substring. Returns the substring (still string)
// for JSON.parse to handle.
function extractJsonBlock(text: string): string {
  const trimmed = text.trim();

  // First fenced block (with or without `json` tag). Non-greedy, no
  // anchors, so trailing prose after the fence is ignored.
  const fence = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const fenceMatch = trimmed.match(fence);

  if (fenceMatch) return fenceMatch[1]!.trim();

  // No fence: find first `{` and walk forward counting braces (respecting
  // strings / escapes) until balanced. Robust to prose around the object.
  const start = trimmed.indexOf("{");

  if (start === -1) return trimmed;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }

  // Unbalanced: hand the whole thing to JSON.parse and let it fail.
  return trimmed;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function parseExtractResponse(text: string): ExtractedMemory[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonBlock(text));
  } catch {
    return [];
  }

  const obs = (parsed as { observations?: unknown }).observations;

  if (!Array.isArray(obs)) return [];

  const result: ExtractedMemory[] = [];

  for (const raw of obs) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    if (typeof r.content !== "string" || !r.content.trim()) continue;
    if (typeof r.kind !== "string" || !VALID_KINDS.has(r.kind)) continue;

    const importance = typeof r.importance === "number" ? clamp(r.importance, 0.1, 1.0) : 0.5;
    const topics = Array.isArray(r.topics)
      ? r.topics.filter((t): t is string => typeof t === "string")
      : [];

    result.push({
      content: r.content.trim(),
      kind: r.kind,
      importance,
      topics,
    });
  }

  return result;
}

export function parseClusterResponse(text: string): {
  title: string;
  summary: string;
} | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonBlock(text));
  } catch {
    return null;
  }

  const p = parsed as { title?: unknown; summary?: unknown };

  if (typeof p.title !== "string" || typeof p.summary !== "string") return null;

  return { title: p.title.trim(), summary: p.summary.trim() };
}

// ── Concept synthesis (crystallize worker) ───────────────────────────

export type ConceptDraft = {
  concept_id: string;
  concept_type: string;
  title: string;
  body: string;
  tags: string[];
  related_to: string[];
  source_member_ids: string[];
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const CONCEPT_PROMPT = `You maintain a small, durable knowledge index for ONE code repository.
You are given that repo's existing cluster summaries (or, if none, its top memories).
Produce a SMALL set (at most 25) of concepts capturing what this repo IS and how it works.
Exactly ONE concept must have concept_type "Overview" (what the repo is, its architecture, current state).
Others use concept_type in: Subsystem, Decision, Convention, Runbook, Glossary.
Return STRICT JSON: {"concepts":[{"concept_type":"...","title":"...","body":"...","tags":[],"related_to":[],"source_member_ids":[]}]}.
- title: 3-8 words, factual. body: 2-6 sentences, present tense, no fluff.
- related_to: titles of other concepts in THIS response it connects to.
- source_member_ids: ids of the input items this concept distills.`;

export function parseConceptResponse(raw: string, repo: string): ConceptDraft[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonBlock(raw));
  } catch {
    return null;
  }

  const arr = (parsed as { concepts?: unknown }).concepts;

  if (!Array.isArray(arr)) return null;

  const out: ConceptDraft[] = [];

  for (const c of arr as Record<string, unknown>[]) {
    const type = String(c.concept_type ?? "");
    const title = String(c.title ?? "");

    if (!type || !title) continue;

    out.push({
      concept_id: `${repo}/${slugify(type)}/${slugify(title)}`,
      concept_type: type,
      title,
      body: String(c.body ?? ""),
      tags: Array.isArray(c.tags) ? (c.tags as string[]) : [],
      related_to: Array.isArray(c.related_to) ? (c.related_to as string[]) : [],
      source_member_ids: Array.isArray(c.source_member_ids)
        ? (c.source_member_ids as string[])
        : [],
    });
  }

  return out;
}

export async function synthesizeConcepts(
  repo: string,
  items: { id: string; content: string }[],
): Promise<ConceptDraft[]> {
  const input = items.map((m) => `- (${m.id}) ${m.content}`).join("\n");
  const raw = await callClaude(input, DREAM_MODEL, CONCEPT_PROMPT);

  return parseConceptResponse(raw, repo) ?? [];
}

// ── Per-pipeline model selection ─────────────────────────────────────
// Extract is high-volume (every coalesced
// batch of captures, many per session) so Haiku is the right fit:
// fast, cheap, plenty smart for "summarize this conversation into atomic
// observations." Dream is low-volume but high-impact (cluster summaries
// + supersede decisions persist across all future recall) so Sonnet's
// stronger judgment is worth it.
export const EXTRACT_MODEL = "haiku";
export const DREAM_MODEL = "sonnet";

// All model calls go through the long-lived streaming SDK session — one
// persistent `claude` subprocess per (model, systemPrompt) tuple, reused
// across every extract / distill / supersede call. Subprocess startup
// overhead (~10s) pays once per daemon lifetime instead of once per
// batch; per-call latency drops to the inference path (~3-5s on Haiku).
//
// systemPrompt is passed as a raw string to the SDK so it replaces
// Claude Code's default coding-assistant preset — without that override
// our JSON-output instructions sit under "you are a coding assistant"
// and the model responds in coding-help style instead.
function callClaude(prompt: string, model: string, systemPrompt: string): Promise<string> {
  return streamingCallClaude(prompt, model, systemPrompt);
}

function authDetail(mode: AuthMode): string {
  switch (mode) {
    case "api-key":
      return "SDK + ANTHROPIC_API_KEY (pay-per-token)";
    case "oauth-token":
      return "SDK + CLAUDE_CODE_OAUTH_TOKEN (long-lived subscription token)";
    case "claude-code":
      return "SDK + claude CLI session (auth resolved by SDK from platform-native store)";
  }
}

export const claudeProvider: AgentProvider = {
  name: "claude",

  async isAvailable(): Promise<AvailabilityStatus> {
    const mode = detectAuthMode();

    return { available: true, detail: authDetail(mode) };
  },

  async extract({ captures }): Promise<ExtractedMemory[]> {
    if (captures.length === 0) return [];
    const prompt = buildExtractPrompt(captures);
    const response = await callClaude(prompt, EXTRACT_MODEL, SYSTEM_PROMPT);

    if (process.env.MNEME_DEBUG_LLM === "1") {
      console.log(
        `[claude.extract] response (${response.length} chars):\n${response.slice(0, 800)}`,
      );
    }

    return parseExtractResponse(response);
  },

  async distill(cluster: Memory[]): Promise<DreamOutput> {
    const prompt = buildClusterPrompt(cluster);
    const response = await callClaude(prompt, DREAM_MODEL, CLUSTER_PROMPT);
    const parsed = parseClusterResponse(response);

    if (!parsed) {
      throw new Error("claude.distill: failed to parse cluster response");
    }

    return { title: parsed.title, summary: parsed.summary };
  },

  async findSupersedes(candidates: SupersedeCandidate[]): Promise<SupersedePair[]> {
    if (candidates.length < 2) return [];
    const prompt = buildSupersedePrompt(candidates);
    const response = await callClaude(prompt, DREAM_MODEL, SUPERSEDE_PROMPT);

    return parseSupersedeResponse(response);
  },

  supportsDream(): boolean {
    return true;
  },
};
