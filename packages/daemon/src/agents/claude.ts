// Claude provider.
//
// Three auth paths, in priority order:
//   1. CLAUDE_CODE_OAUTH_TOKEN -> SDK with subscription billing
//   2. ANTHROPIC_API_KEY        -> SDK with pay-per-token billing
//   3. (default)                -> subprocess `claude -p`, inherits CLI OAuth
//
// Phase 1 wires only path 3 (subprocess). Paths 1 and 2 are detected so
// the user can see them in `mneme agent list` and so we have a hook to
// upgrade later, but extract() / distill() route through subprocess
// regardless. The subprocess path is what gives the "just install Claude
// Code, no setup" UX. SDK paths are an opt-in optimization.

import { spawn } from "node:child_process";
import { CLUSTER_PROMPT, SUPERSEDE_PROMPT, SYSTEM_PROMPT } from "./prompts.ts";
import type {
  AgentProvider,
  AvailabilityStatus,
  Capture,
  DreamOutput,
  ExtractedMemory,
  Memory,
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

  return `${SYSTEM_PROMPT}\n\nNow extract observations from the following captures.\n\n${blocks}\n\nReturn JSON only.`;
}

export function buildClusterPrompt(memories: Memory[]): string {
  const lines = memories.map((m, i) => `${i + 1}. (${m.kind}) ${m.content}`);
  return `${CLUSTER_PROMPT}\n\nMemories in this cluster:\n${lines.join("\n")}\n\nReturn JSON only.`;
}

export function buildSupersedePrompt(
  memories: Array<Memory & { id: string; created_at: string }>,
): string {
  const lines = memories.map(
    (m) => `id=${m.id} kind=${m.kind} created_at=${m.created_at}: ${m.content}`,
  );
  return `${SUPERSEDE_PROMPT}\n\nMemories under review:\n${lines.join("\n")}\n\nReturn JSON only.`;
}

// Strip ```json ... ``` fences if present. Older models sometimes wrap
// JSON output despite explicit instructions otherwise.
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
  const match = trimmed.match(fence);
  return match ? match[1]!.trim() : trimmed;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function parseExtractResponse(text: string): ExtractedMemory[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
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
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    return null;
  }
  const p = parsed as { title?: unknown; summary?: unknown };
  if (typeof p.title !== "string" || typeof p.summary !== "string") return null;
  return { title: p.title.trim(), summary: p.summary.trim() };
}

// Spawn `claude -p <prompt>` and collect stdout. Returns the model's full
// response as a string. Errors out non-zero exit codes (e.g. CLI not
// installed, OAuth not logged in, prompt too long).
async function callClaudeSubprocess(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("claude", ["-p", prompt], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude exited ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

function authDetail(mode: AuthMode): string {
  switch (mode) {
    case "oauth-token":
      return "SDK with CLAUDE_CODE_OAUTH_TOKEN (Max subscription)";
    case "api-key":
      return "SDK with ANTHROPIC_API_KEY (pay-per-token)";
    case "subprocess":
      return "subprocess `claude -p` (Claude Code OAuth, Max subscription)";
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
    const response = await callClaudeSubprocess(prompt);
    return parseExtractResponse(response);
  },

  async distill(cluster: Memory[]): Promise<DreamOutput> {
    const prompt = buildClusterPrompt(cluster);
    const response = await callClaudeSubprocess(prompt);
    const parsed = parseClusterResponse(response);
    if (!parsed) {
      throw new Error("claude.distill: failed to parse cluster response");
    }
    return { title: parsed.title, summary: parsed.summary };
  },

  supportsDream(): boolean {
    return true;
  },
};
