// Claude provider.
//
// Uses @anthropic-ai/claude-agent-sdk's `query()` with
// pathToClaudeCodeExecutable pointing at the local `claude` binary.
// That gives us all three of:
//   - Auth inheritance from the user's existing `claude login` (no
//     ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN setup required)
//   - Structured assistant-message streaming (no stdout regex)
//   - Tool restrictions (extractor can't accidentally run Bash/Edit/etc.)
//
// detectAuthMode() still reports oauth-token / api-key / subprocess for
// `mneme agent list` visibility, but the call always routes through the
// SDK regardless. The mode just shifts which credential the SDK picks
// up - subprocess mode pulls Claude Code's own login under the hood.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { streamingCallClaude, streamingEnabled } from "./claude-streaming.ts";
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

export type AuthMode = "oauth-token" | "api-key" | "subprocess";

export function detectAuthMode(): AuthMode {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return "oauth-token";
  if (process.env.ANTHROPIC_API_KEY) return "api-key";
  return "subprocess";
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

export function buildSupersedePrompt(
  candidates: SupersedeCandidate[],
): string {
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

    const importance =
      typeof r.importance === "number"
        ? clamp(r.importance, 0.1, 1.0)
        : 0.5;
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

// Locate the local `claude` binary. Used for SDK's
// pathToClaudeCodeExecutable so the SDK spawns the existing CLI (which
// has the user's OAuth) instead of trying to use ANTHROPIC_API_KEY.
function findClaudeExecutable(): string {
  if (process.env.CLAUDE_EXECUTABLE_PATH) {
    return process.env.CLAUDE_EXECUTABLE_PATH;
  }
  const which = spawnSync("which", ["claude"], { encoding: "utf8" });
  const fromPath = which.stdout?.trim();
  if (fromPath && existsSync(fromPath)) return fromPath;

  const fallbacks = [
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
    `${homedir()}/.local/bin/claude`,
    `${homedir()}/.bun/bin/claude`,
  ];
  for (const candidate of fallbacks) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    "claude executable not found. Install Claude Code or set CLAUDE_EXECUTABLE_PATH.",
  );
}

// SDK-restricted tools. The extractor produces text only; it has no
// reason to read files, run Bash, or query the web. Blocking them is
// a defense-in-depth measure (the prompts are not strictly adversarial,
// but a model with tool access can hallucinate detours that waste
// quota). Same shape as claude-mem's restriction list.
const DISALLOWED_TOOLS = [
  "Bash",
  "Read",
  "Write",
  "Edit",
  "Grep",
  "Glob",
  "WebFetch",
  "WebSearch",
  "Task",
  "TodoWrite",
];

// Per-pipeline model selection. Extract is high-volume (every coalesced
// batch of captures, many per session) so Haiku is the right fit:
// fast, cheap, plenty smart for "summarize this conversation into atomic
// observations." Dream is low-volume but high-impact (cluster summaries
// + supersede decisions persist across all future recall) so Sonnet's
// stronger judgment is worth it.
export const EXTRACT_MODEL = "haiku";
export const DREAM_MODEL = "sonnet";

// Run a one-shot prompt through the Agent SDK, collect the assistant's
// final text response. Throws on non-success terminal results so the
// caller can decide whether to retry / mark failed.
//
// systemPrompt is passed as a raw string to fully replace Claude Code's
// default coding-assistant preset. Without this override, our extract /
// cluster / supersede instructions sit under "you are a coding
// assistant" and the model responds in coding-help style instead of
// returning the JSON we asked for.
async function callClaude(
  prompt: string,
  model: string,
  systemPrompt: string,
): Promise<string> {
  // Default path: long-lived streaming session reuses one subprocess
  // across many calls. Fall back to one-shot when the operator opts
  // out via MNEME_DISABLE_STREAMING_SDK=1.
  if (streamingEnabled()) {
    return streamingCallClaude(prompt, model, systemPrompt);
  }
  return callClaudeOneShot(prompt, model, systemPrompt);
}

async function callClaudeOneShot(
  prompt: string,
  model: string,
  systemPrompt: string,
): Promise<string> {
  const messages = query({
    prompt,
    options: {
      model,
      systemPrompt,
      pathToClaudeCodeExecutable: findClaudeExecutable(),
      disallowedTools: DISALLOWED_TOOLS,
      mcpServers: {},
      settingSources: [],
      strictMcpConfig: true,
      includePartialMessages: false,
    } as never,
  });

  let response = "";
  let errorReason: string | null = null;

  for await (const msg of messages) {
    if (msg.type === "assistant") {
      if (msg.error) {
        errorReason = msg.error;
        continue;
      }
      const content = (msg.message as { content?: unknown }).content;
      if (typeof content === "string") {
        response += content;
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (
            block &&
            typeof block === "object" &&
            (block as { type?: string }).type === "text" &&
            typeof (block as { text?: unknown }).text === "string"
          ) {
            response += (block as { text: string }).text;
          }
        }
      }
    } else if (msg.type === "result") {
      if (msg.subtype !== "success") {
        const detail = (msg as { error?: unknown }).error ?? msg.subtype;
        throw new Error(
          `claude SDK result not success: ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 200)}`,
        );
      }
      break;
    }
  }

  if (errorReason && !response.trim()) {
    throw new Error(`claude SDK assistant error: ${errorReason}`);
  }
  return response;
}

function authDetail(mode: AuthMode): string {
  switch (mode) {
    case "oauth-token":
      return "SDK + CLAUDE_CODE_OAUTH_TOKEN (Max subscription)";
    case "api-key":
      return "SDK + ANTHROPIC_API_KEY (pay-per-token)";
    case "subprocess":
      return "SDK + claude CLI subprocess (Max subscription, OAuth inherited)";
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

  async findSupersedes(
    candidates: SupersedeCandidate[],
  ): Promise<SupersedePair[]> {
    if (candidates.length < 2) return [];
    const prompt = buildSupersedePrompt(candidates);
    const response = await callClaude(prompt, DREAM_MODEL, SUPERSEDE_PROMPT);
    return parseSupersedeResponse(response);
  },

  supportsDream(): boolean {
    return true;
  },
};
