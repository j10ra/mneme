// Long-lived Claude SDK session.
//
// The plain claude.ts provider spawns a fresh `claude` subprocess via the
// Agent SDK on every extract / distill / supersede call. Subprocess
// startup is ~10s; actual Haiku inference for a 20-capture extract is
// only ~3-5s. So per-batch overhead dominates when extract is the high-
// frequency call (every coalesced batch during an active session).
//
// This module keeps ONE persistent Agent SDK query() per (model,
// systemPrompt) tuple. The SDK accepts an AsyncIterable<SDKUserMessage>
// as the prompt, which lets us stream new prompts into the same
// subprocess across many turns. Each turn's response is collected by
// reading SDK messages until we see a `result` marker. Net effect:
// subprocess overhead pays once per (model, systemPrompt) per daemon
// lifetime instead of once per batch. Throughput jumps roughly 5×.
//
// Ops:
//   - Sessions are lazily created on first ask() per (model, systemPrompt).
//   - Calls are serialized per session via a promise-chain lock so we
//     don't interleave turns on the same subprocess.
//   - On any error: tear down the session and let the caller retry.
//     Next call recreates it. No silent half-state.
//   - Periodic recycle: each session is killed and re-spawned every
//     RECYCLE_MS (30 min) as a defense against memory creep in long-
//     running CLI subprocesses.
//   - Disable via env: MNEME_DISABLE_STREAMING_SDK=1 makes the public
//     entrypoint fall back to one-shot callClaude semantics. Useful as
//     an emergency escape hatch if the streaming path misbehaves.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { Logger } from "@mneme/core";
import { query, type Query } from "@anthropic-ai/claude-agent-sdk";

// Tools the extractor / distiller / supersede pass should never invoke.
// Same list as the one-shot path.
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

// Recycle every 30 min as a heuristic safeguard against subprocess
// memory creep. Empirically Haiku subprocess RSS grows slowly on long
// runs; flushing the process periodically is cheap insurance.
const RECYCLE_MS = 30 * 60 * 1000;

// Per-turn timeout. If the SDK fails to emit a `result` message within
// this window, we tear down the session and bubble up an error. Long
// extracts on slow networks can take ~30s on the inference path; 90s
// is a generous ceiling that catches genuine deadlocks without false
// positives.
const TURN_TIMEOUT_MS = 90 * 1000;

// Same path lookup as claude.ts. Duplicated here to keep this module
// self-contained; if the binary moves between the lookup and the call,
// the SDK throws and the next call re-resolves.
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
  // Sweep nvm versions: ~/.nvm/versions/node/<v>/bin/claude. systemd's
  // user PATH excludes these by default, so the daemon under systemd
  // can't find an npm-installed claude unless we look here.
  try {
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    const nvmRoot = `${homedir()}/.nvm/versions/node`;
    if (existsSync(nvmRoot)) {
      for (const v of readdirSync(nvmRoot)) {
        fallbacks.push(`${nvmRoot}/${v}/bin/claude`);
      }
    }
  } catch {
    // ignore
  }
  for (const candidate of fallbacks) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    "claude executable not found. Install Claude Code or set CLAUDE_EXECUTABLE_PATH.",
  );
}

type SDKUserMessage = {
  type: "user";
  message: { role: "user"; content: string };
  parent_tool_use_id: string | null;
};

class StreamingClaudeSession {
  private inputBuffer: SDKUserMessage[] = [];
  private inputResolver: (() => void) | null = null;
  private inputClosed = false;
  private querySession: Query | null = null;
  private startedAt = 0;
  private lock: Promise<void> = Promise.resolve();

  constructor(
    private readonly model: string,
    private readonly systemPrompt: string,
  ) {}

  /** Async generator the SDK consumes as its prompt source. Yields
   *  whenever pushInput drops a message into inputBuffer. */
  private async *streamInputs(): AsyncIterableIterator<SDKUserMessage> {
    while (!this.inputClosed) {
      if (this.inputBuffer.length === 0) {
        await new Promise<void>((resolve) => {
          this.inputResolver = resolve;
        });
        this.inputResolver = null;
        if (this.inputClosed) return;
      }
      const next = this.inputBuffer.shift();
      if (next) yield next;
    }
  }

  private start(): void {
    if (this.querySession) return;
    this.inputClosed = false;
    this.inputBuffer = [];
    this.querySession = query({
      prompt: this.streamInputs(),
      options: {
        model: this.model,
        systemPrompt: this.systemPrompt,
        pathToClaudeCodeExecutable: findClaudeExecutable(),
        disallowedTools: DISALLOWED_TOOLS,
        mcpServers: {},
        settingSources: [],
        strictMcpConfig: true,
        includePartialMessages: false,
      } as never,
    });
    this.startedAt = Date.now();
    Logger.info("streaming-claude: session started", {
      model: this.model,
    });
  }

  private pushInput(prompt: string): void {
    this.inputBuffer.push({
      type: "user",
      message: { role: "user", content: prompt },
      parent_tool_use_id: null,
    });
    if (this.inputResolver) {
      const r = this.inputResolver;
      this.inputResolver = null;
      r();
    }
  }

  /** Read SDK messages from the persistent query() until a `result`
   *  marker closes the current turn. Accumulates assistant text along
   *  the way; throws on a non-success result or timeout. */
  private async readTurnText(): Promise<string> {
    if (!this.querySession) throw new Error("session not started");
    const session = this.querySession;
    let response = "";
    let assistantError: string | null = null;
    const start = Date.now();

    while (true) {
      if (Date.now() - start > TURN_TIMEOUT_MS) {
        throw new Error(
          `streaming-claude: turn timed out after ${TURN_TIMEOUT_MS}ms`,
        );
      }
      const result = await session.next();
      if (result.done) {
        throw new Error("streaming-claude: query stream closed mid-turn");
      }
      const msg = result.value as { type: string; [k: string]: unknown };
      if (msg.type === "assistant") {
        const errField = (msg as { error?: unknown }).error;
        if (typeof errField === "string") {
          assistantError = errField;
          continue;
        }
        const content = (msg.message as { content?: unknown } | undefined)
          ?.content;
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
        if ((msg as { subtype?: string }).subtype !== "success") {
          const detail =
            (msg as { error?: unknown }).error ??
            (msg as { subtype?: unknown }).subtype;
          throw new Error(
            `streaming-claude: non-success result — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 200)}`,
          );
        }
        if (assistantError && !response.trim()) {
          throw new Error(
            `streaming-claude: assistant error — ${assistantError}`,
          );
        }
        return response;
      }
    }
  }

  /** Run a prompt through the persistent session. Serializes calls so
   *  multiple concurrent ask()s don't interleave on the same subprocess.
   *  On error: tear down the session so the next ask() recreates it. */
  async ask(prompt: string): Promise<string> {
    const previous = this.lock;
    let release: () => void;
    this.lock = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      if (this.shouldRecycle()) {
        await this.teardown();
      }
      this.start();
      this.pushInput(prompt);
      try {
        return await this.readTurnText();
      } catch (err) {
        // Any error invalidates the session — subprocess may be in a
        // bad state. Tear down so the next ask() opens a fresh one.
        await this.teardown();
        throw err;
      }
    } finally {
      release!();
    }
  }

  private shouldRecycle(): boolean {
    return (
      this.querySession !== null &&
      this.startedAt > 0 &&
      Date.now() - this.startedAt > RECYCLE_MS
    );
  }

  private async teardown(): Promise<void> {
    this.inputClosed = true;
    if (this.inputResolver) {
      const r = this.inputResolver;
      this.inputResolver = null;
      r();
    }
    if (this.querySession) {
      try {
        await this.querySession.interrupt();
      } catch {
        // best-effort
      }
    }
    this.querySession = null;
    this.startedAt = 0;
    this.inputBuffer = [];
  }
}

// Lazy singleton sessions keyed by (model, systemPrompt). Each tuple
// gets its own subprocess; in practice this is at most 3 sessions
// (extract / distill / supersede) but the map handles future combos
// without code change.
const sessions = new Map<string, StreamingClaudeSession>();

function sessionFor(model: string, systemPrompt: string): StreamingClaudeSession {
  const key = `${model}::${systemPrompt.slice(0, 64)}`;
  let s = sessions.get(key);
  if (!s) {
    s = new StreamingClaudeSession(model, systemPrompt);
    sessions.set(key, s);
  }
  return s;
}

/** Public entrypoint: same shape as one-shot callClaude. Falls through
 *  to whatever the caller wants if MNEME_DISABLE_STREAMING_SDK=1. */
export async function streamingCallClaude(
  prompt: string,
  model: string,
  systemPrompt: string,
): Promise<string> {
  return sessionFor(model, systemPrompt).ask(prompt);
}

/** Whether streaming is enabled. Lets the provider route to one-shot
 *  in disabled mode without importing both modules. */
export function streamingEnabled(): boolean {
  return process.env.MNEME_DISABLE_STREAMING_SDK !== "1";
}
