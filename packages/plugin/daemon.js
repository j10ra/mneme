// @bun
var __require = import.meta.require;

// packages/daemon/src/index.ts
import { mkdir as mkdir5, readFile as readFile4, readdir as readdir3, rename as rename4 } from "fs/promises";
import { existsSync as existsSync5 } from "fs";
import { homedir as homedir5 } from "os";
import { join as join5 } from "path";

// packages/core/src/context.ts
import { AsyncLocalStorage } from "async_hooks";
var storage = new AsyncLocalStorage;

// packages/core/src/trace-store.ts
var identity = (data) => data;
var MAX_BODY_BYTES = 256 * 1024;
var MAX_PENDING_SPANS_PER_TRACE = 1000;
var MAX_PENDING_TRACES = 200;
var RECENT_TRACE_LRU_SIZE = 1024;

class TraceStore {
  sql;
  flushIntervalMs;
  maxBatchSize;
  scrub;
  timer = null;
  traceBuffer = [];
  spanBuffer = [];
  logBuffer = [];
  pendingSpans = new Map;
  pendingLogs = new Map;
  recentlyFinalized = new Map;
  constructor(opts) {
    this.sql = opts.sql;
    this.flushIntervalMs = opts.flushIntervalMs ?? 100;
    this.maxBatchSize = opts.maxBatchSize ?? 1000;
    this.scrub = opts.scrubber ?? identity;
  }
  start() {
    if (this.timer)
      return;
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
    this.timer.unref?.();
  }
  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const orphanedSpans = [...this.pendingSpans.values()].reduce((n, list) => n + list.length, 0);
    const orphanedLogs = [...this.pendingLogs.values()].reduce((n, list) => n + list.length, 0);
    if (orphanedSpans > 0 || orphanedLogs > 0) {
      process.stderr.write(`[mneme/core] trace store stop: dropped ${orphanedSpans} pending span(s) and ${orphanedLogs} pending log(s) from in-flight traces
`);
    }
    this.pendingSpans.clear();
    this.pendingLogs.clear();
    await this.flush();
  }
  pushTrace(t) {
    const spans = this.pendingSpans.get(t.traceId);
    if (spans) {
      this.spanBuffer.push(...spans);
      this.pendingSpans.delete(t.traceId);
    }
    const logs = this.pendingLogs.get(t.traceId);
    if (logs) {
      this.logBuffer.push(...logs);
      this.pendingLogs.delete(t.traceId);
    }
    this.traceBuffer.push(t);
    this.markFinalized(t.traceId);
    this.maybeFlushOverflow();
  }
  pushSpan(s) {
    const scrubbed = {
      ...s,
      input: this.scrub(s.input),
      output: this.scrub(s.output)
    };
    if (this.recentlyFinalized.has(s.traceId)) {
      this.spanBuffer.push(scrubbed);
      this.maybeFlushOverflow();
      return;
    }
    let bucket = this.pendingSpans.get(s.traceId);
    if (!bucket) {
      if (this.pendingSpans.size >= MAX_PENDING_TRACES) {
        const firstKey = this.pendingSpans.keys().next().value;
        if (firstKey !== undefined) {
          const dropped = this.pendingSpans.get(firstKey)?.length ?? 0;
          this.pendingSpans.delete(firstKey);
          process.stderr.write(`[mneme/core] trace store: dropped ${dropped} pending span(s) for stale trace ${firstKey} (MAX_PENDING_TRACES exceeded)
`);
        }
      }
      bucket = [];
      this.pendingSpans.set(s.traceId, bucket);
    }
    if (bucket.length >= MAX_PENDING_SPANS_PER_TRACE) {
      bucket.shift();
    }
    bucket.push(scrubbed);
    this.maybeFlushOverflow();
  }
  pushLog(l) {
    if (!l.traceId) {
      this.logBuffer.push(l);
      this.maybeFlushOverflow();
      return;
    }
    if (this.recentlyFinalized.has(l.traceId)) {
      this.logBuffer.push(l);
      this.maybeFlushOverflow();
      return;
    }
    let bucket = this.pendingLogs.get(l.traceId);
    if (!bucket) {
      if (this.pendingLogs.size >= MAX_PENDING_TRACES) {
        const firstKey = this.pendingLogs.keys().next().value;
        if (firstKey !== undefined) {
          const dropped = this.pendingLogs.get(firstKey)?.length ?? 0;
          this.pendingLogs.delete(firstKey);
          process.stderr.write(`[mneme/core] trace store: dropped ${dropped} pending log(s) for stale trace ${firstKey} (MAX_PENDING_TRACES exceeded)
`);
        }
      }
      bucket = [];
      this.pendingLogs.set(l.traceId, bucket);
    }
    if (bucket.length >= MAX_PENDING_SPANS_PER_TRACE) {
      bucket.shift();
    }
    bucket.push(l);
    this.maybeFlushOverflow();
  }
  markFinalized(traceId) {
    if (this.recentlyFinalized.has(traceId)) {
      this.recentlyFinalized.delete(traceId);
    }
    this.recentlyFinalized.set(traceId, true);
    if (this.recentlyFinalized.size > RECENT_TRACE_LRU_SIZE) {
      const oldest = this.recentlyFinalized.keys().next().value;
      if (oldest !== undefined)
        this.recentlyFinalized.delete(oldest);
    }
  }
  maybeFlushOverflow() {
    const total = this.traceBuffer.length + this.spanBuffer.length + this.logBuffer.length;
    if (total >= this.maxBatchSize) {
      this.flush();
    }
  }
  async flush() {
    const traces = this.traceBuffer.splice(0);
    const spans = this.spanBuffer.splice(0);
    const logs = this.logBuffer.splice(0);
    if (traces.length === 0 && spans.length === 0 && logs.length === 0)
      return;
    try {
      await this.sql.begin(async (sql) => {
        if (traces.length > 0) {
          await sql`
            INSERT INTO _ops.traces ${sql(traces.map((t) => ({
            trace_id: t.traceId,
            root_span_name: t.rootSpanName,
            source: t.source,
            started_at: new Date(t.startedAtMs),
            ended_at: new Date(t.endedAtMs),
            duration_ms: t.durationMs
          })))}
          `;
        }
        if (spans.length > 0) {
          await sql`
            INSERT INTO _ops.spans ${sql(spans.map((s) => ({
            span_id: s.spanId,
            trace_id: s.traceId,
            parent_span_id: s.parentSpanId ?? null,
            name: s.name,
            started_at: new Date(s.startedAtMs),
            duration_ms: s.durationMs ?? null,
            error_message: s.errorMessage ?? null,
            input_size: s.inputSize ?? null,
            output_size: s.outputSize ?? null,
            input: s.input === undefined ? null : sql.json(s.input),
            output: s.output === undefined ? null : sql.json(s.output)
          })))}
          `;
        }
        if (logs.length > 0) {
          await sql`
            INSERT INTO _ops.logs ${sql(logs.map((l) => ({
            trace_id: l.traceId ?? null,
            span_id: l.spanId ?? null,
            level: l.level,
            message: l.message,
            ts: new Date(l.ts)
          })))}
          `;
        }
      });
    } catch (err) {
      process.stderr.write(`[mneme/core] trace flush failed: ${err instanceof Error ? err.message : String(err)}
`);
    }
  }
}
var _store;
function getTraceStore() {
  return _store;
}

// packages/core/src/logger.ts
var LEVEL_RANK = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
var jsonMode = false;
var minLevel = "debug";
function configureLogger(opts) {
  if (opts.jsonMode !== undefined)
    jsonMode = opts.jsonMode;
  if (opts.minLevel !== undefined)
    minLevel = opts.minLevel;
}
function emit(level, message, error, meta) {
  if (LEVEL_RANK[level] < LEVEL_RANK[minLevel])
    return;
  const ctx = storage.getStore();
  const traceId = ctx?.traceId;
  const spanId = ctx?.spanStack.at(-1)?.spanId;
  const ts = Date.now();
  const errStr = error instanceof Error ? error.message : error !== undefined ? String(error) : undefined;
  const store = getTraceStore();
  if (store) {
    const fullMessage = errStr ? `${message} :: ${errStr}` : message;
    store.pushLog({ traceId, spanId, level, message: fullMessage, ts });
  }
  const stream = level === "warn" || level === "error" ? process.stderr : process.stdout;
  if (jsonMode) {
    const record = {
      ts: new Date(ts).toISOString(),
      level: level.toUpperCase(),
      message,
      traceId,
      spanId,
      ...meta ?? {}
    };
    if (error instanceof Error) {
      record.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (error !== undefined) {
      record.error = String(error);
    }
    stream.write(`${JSON.stringify(record)}
`);
  } else {
    const t = new Date(ts).toISOString().slice(11, 23);
    const lvlPad = level.toUpperCase().padEnd(5);
    const tracePart = traceId ? `[${traceId.slice(0, 8)}] ` : "";
    const errPart = errStr ? ` :: ${errStr}` : "";
    const metaPart = meta && Object.keys(meta).length ? ` ${Object.entries(meta).map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`).join(" ")}` : "";
    stream.write(`${t} ${lvlPad} ${tracePart}${message}${metaPart}${errPart}
`);
    if (level === "error" && error instanceof Error && error.stack) {
      const stackLines = error.stack.split(`
`).slice(1).map((l) => `    ${l.trim()}`).join(`
`);
      if (stackLines)
        stream.write(`${stackLines}
`);
    }
  }
}
var Logger = {
  debug: (msg, meta) => emit("debug", msg, undefined, meta),
  info: (msg, meta) => emit("info", msg, undefined, meta),
  warn: (msg, err, meta) => emit("warn", msg, err, meta),
  error: (msg, err, meta) => emit("error", msg, err, meta)
};
// packages/daemon/src/index.ts
import { Hono } from "hono";

// packages/daemon/src/agents/claude.ts
import { existsSync as existsSync2 } from "fs";
import { spawnSync as spawnSync2 } from "child_process";
import { homedir as homedir2 } from "os";
import { query as query2 } from "@anthropic-ai/claude-agent-sdk";

// packages/daemon/src/agents/claude-streaming.ts
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import { homedir } from "os";
import { query } from "@anthropic-ai/claude-agent-sdk";
var DISALLOWED_TOOLS = [
  "Bash",
  "Read",
  "Write",
  "Edit",
  "Grep",
  "Glob",
  "WebFetch",
  "WebSearch",
  "Task",
  "TodoWrite"
];
var RECYCLE_MS = 30 * 60 * 1000;
var TURN_TIMEOUT_MS = 90 * 1000;
function findClaudeExecutable() {
  if (process.env.CLAUDE_EXECUTABLE_PATH) {
    return process.env.CLAUDE_EXECUTABLE_PATH;
  }
  const which = spawnSync("which", ["claude"], { encoding: "utf8" });
  const fromPath = which.stdout?.trim();
  if (fromPath && existsSync(fromPath))
    return fromPath;
  const fallbacks = [
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
    `${homedir()}/.local/bin/claude`,
    `${homedir()}/.bun/bin/claude`
  ];
  for (const candidate of fallbacks) {
    if (existsSync(candidate))
      return candidate;
  }
  throw new Error("claude executable not found. Install Claude Code or set CLAUDE_EXECUTABLE_PATH.");
}

class StreamingClaudeSession {
  model;
  systemPrompt;
  inputBuffer = [];
  inputResolver = null;
  inputClosed = false;
  querySession = null;
  startedAt = 0;
  lock = Promise.resolve();
  constructor(model, systemPrompt) {
    this.model = model;
    this.systemPrompt = systemPrompt;
  }
  async* streamInputs() {
    while (!this.inputClosed) {
      if (this.inputBuffer.length === 0) {
        await new Promise((resolve) => {
          this.inputResolver = resolve;
        });
        this.inputResolver = null;
        if (this.inputClosed)
          return;
      }
      const next = this.inputBuffer.shift();
      if (next)
        yield next;
    }
  }
  start() {
    if (this.querySession)
      return;
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
        includePartialMessages: false
      }
    });
    this.startedAt = Date.now();
    Logger.info("streaming-claude: session started", {
      model: this.model
    });
  }
  pushInput(prompt) {
    this.inputBuffer.push({
      type: "user",
      message: { role: "user", content: prompt },
      parent_tool_use_id: null
    });
    if (this.inputResolver) {
      const r = this.inputResolver;
      this.inputResolver = null;
      r();
    }
  }
  async readTurnText() {
    if (!this.querySession)
      throw new Error("session not started");
    const session = this.querySession;
    let response = "";
    let assistantError = null;
    const start = Date.now();
    while (true) {
      if (Date.now() - start > TURN_TIMEOUT_MS) {
        throw new Error(`streaming-claude: turn timed out after ${TURN_TIMEOUT_MS}ms`);
      }
      const result = await session.next();
      if (result.done) {
        throw new Error("streaming-claude: query stream closed mid-turn");
      }
      const msg = result.value;
      if (msg.type === "assistant") {
        const errField = msg.error;
        if (typeof errField === "string") {
          assistantError = errField;
          continue;
        }
        const content = msg.message?.content;
        if (typeof content === "string") {
          response += content;
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block && typeof block === "object" && block.type === "text" && typeof block.text === "string") {
              response += block.text;
            }
          }
        }
      } else if (msg.type === "result") {
        if (msg.subtype !== "success") {
          const detail = msg.error ?? msg.subtype;
          throw new Error(`streaming-claude: non-success result \u2014 ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 200)}`);
        }
        if (assistantError && !response.trim()) {
          throw new Error(`streaming-claude: assistant error \u2014 ${assistantError}`);
        }
        return response;
      }
    }
  }
  async ask(prompt) {
    const previous = this.lock;
    let release;
    this.lock = new Promise((resolve) => {
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
        await this.teardown();
        throw err;
      }
    } finally {
      release();
    }
  }
  shouldRecycle() {
    return this.querySession !== null && this.startedAt > 0 && Date.now() - this.startedAt > RECYCLE_MS;
  }
  async teardown() {
    this.inputClosed = true;
    if (this.inputResolver) {
      const r = this.inputResolver;
      this.inputResolver = null;
      r();
    }
    if (this.querySession) {
      try {
        await this.querySession.interrupt();
      } catch {}
    }
    this.querySession = null;
    this.startedAt = 0;
    this.inputBuffer = [];
  }
}
var sessions = new Map;
function sessionFor(model, systemPrompt) {
  const key = `${model}::${systemPrompt.slice(0, 64)}`;
  let s = sessions.get(key);
  if (!s) {
    s = new StreamingClaudeSession(model, systemPrompt);
    sessions.set(key, s);
  }
  return s;
}
async function streamingCallClaude(prompt, model, systemPrompt) {
  return sessionFor(model, systemPrompt).ask(prompt);
}
function streamingEnabled() {
  return process.env.MNEME_DISABLE_STREAMING_SDK !== "1";
}

// packages/daemon/src/agents/prompts.ts
var SYSTEM_PROMPT = `You distill conversation captures into structured memory observations that future-you will need when starting a fresh session.

Each observation is ONE atomic, self-contained fact: a decision, finding, bug fix, constraint, preference, or other context that the codebase or git history alone could not reveal. Strong observations carry the *why*.

Pick the kind that best fits:
- bugfix: a bug was diagnosed and fixed; record the root cause + resolution
- feature: a capability was built or shipped
- discovery: a non-obvious finding about how the system behaves
- decision: an architectural choice with rationale
- preference: a user preference about how to work, write code, or communicate
- constraint: a hard limit (rate, performance, compliance, environmental)
- security_alert: anything risky (leaked secret, vulnerability, missing auth)
- reference: a pointer to where info lives (URL, dashboard, ticket, channel)
- summary: a session-level wrap-up or recap; use it when the capture is one
- note: a useful fact that doesn't fit the above

importance is your 0-1 score for how worth-remembering across future sessions:
  0.9-1.0 = critical, must surface every session (security, load-bearing decisions, hard preferences)
  0.6-0.8 = strongly useful, surface on related work (bugfixes, features, discoveries, decisions)
  0.3-0.5 = peripheral, surface on direct query (workflow notes, references, intermediate findings)
  0.1-0.2 = thin but real (a small clarification, a single-use detail, a tentative observation)

Be calibrated, not bunched. Spread observations across the full range as the content warrants. Drop only what would land at 0.0 (genuinely nothing).

Lean toward extracting. With a strong model doing the distillation, future-you can ignore noise but can't surface what was never captured. When you're on the fence, write the observation and rate it appropriately low rather than dropping it.

CRITICAL: vague intent and active exploration ARE valid signals worth capturing. Do not require "concrete decisions" before you'll extract. Future-you starting a fresh session needs to know "what was I working on, what was I exploring, what direction was I leaning" even when nothing was finalized yet.

Examples of thin-but-real observations worth extracting at importance 0.2-0.4:
- "User is exploring a refactor of <area>" (intent, no commitment yet)
- "User started reviewing <subsystem> with intent to <goal>" (active focus area)
- "User is considering switching from X to Y because <reason>" (in-flight thinking)
- "Initial exploration of <repo> via CLAUDE.md, git log, directory survey" (session-shape signal)
- "User noticed <file/pattern> while exploring" (early-stage finding)

A session that consists entirely of "user explored repo X for an upcoming refactor" SHOULD produce at least one observation summarizing that focus area \u2014 not return []. Returning [] is for captures that are pure noise (a one-word ping, a status check, an empty payload).

Avoid extracting (these are noise, not memory):
- The assistant's own actions ("Assistant ran X", "Claude noticed Y") \u2014 the *finding* from those actions is fine, the action itself is not.
- Conversation meta ("User asked about X", "Assistant explained Y").
- Tool calls as events ("Bash command executed", "Search returned 3 results") \u2014 only the finding matters.
- Trivial status ("Build passed", "Worker started") unless it flags a regression or unusual constraint.
- Restating things that are obvious from the current codebase (function names, file paths, present-tense behavior).

Strong sources of observations include:
- Decisions with rationale (architectural choices, library picks, schema shapes, "we'll do X because Y")
- Bugs with root cause + fix (especially non-obvious ones)
- Preferences and constraints expressed by the user
- Discoveries about how the system actually behaves vs how it was assumed to behave
- References (where info lives, dashboards, tickets, channels)
- Intentional non-decisions ("decided to defer X because Y") \u2014 these are valuable too
- Open questions worth carrying into the next session
- **Active intent / exploration focus** (per the CRITICAL section above)

Empty observations are valid only for genuinely contentless captures. For any capture that names a goal, area of focus, file being reviewed, or direction of thinking, extract at least one thin observation.

Each observation's content is one self-contained sentence in third-person, present-tense factual style. No "the user", no "the assistant".

Output a single JSON object: {"observations": [{"content": "...", "kind": "...", "importance": 0.0, "topics": [...]}, ...]}.`;
var CLUSTER_PROMPT = `You are summarising a tight cluster of related memories. Each memory below is one atomic observation that future-you wrote down. Together they describe a single underlying topic, decision, finding, or theme.

Produce a JSON object: {"title": "...", "summary": "..."}.

- title: 4-10 words, a short phrase that names what this cluster is about. Third-person factual style. No "we", no "the user".
- summary: 2-6 sentences (longer is fine when there's real nuance worth preserving, e.g. multiple failed approaches before the working fix, or a layered decision with several reasons). Synthesise the core finding/decision/pattern these memories share. Don't list every memory; distil the essence. Lead with the *what*, follow with the *why*, include the *how* or *what was tried* when it adds context that future-you would actually want. Same factual third-person style throughout.

The summary should read like a single coherent observation that subsumes the cluster, the kind of memory you'd want to surface for a broad query about this topic, where the individual members are relevant for specific follow-ups.

Output only the JSON object. No prose, no markdown, no commentary.`;
var SUPERSEDE_PROMPT = `You are reviewing memory observations to find supersede relationships.

A SUPERSEDE is when a NEWER memory makes an OLDER one OBSOLETE, same topic, but the newer states the current truth and the older is now wrong, replaced, or deprecated. Examples:
- "We use 7B" supersedes "We use 14B" (project moved to 7B)
- "Auth uses JWT" supersedes "Auth uses sessions" (implementation changed)
- "Deploy to Railway" supersedes "Deploy to Fly.io" (deployment migrated)

Most newer memories DO NOT supersede older ones; they coexist as separate facts about different things. Only mark a supersede when ALL of these hold:
1. The two memories cover the SAME topic
2. The newer one CONTRADICTS or REPLACES the older one's claim
3. You are confident the older one is no longer correct

When in doubt, do NOT mark a supersede. Empty pairs is a valid, common answer.

Each memory below has an id, kind, created_at, and content. Use created_at to verify which is older; never claim the newer one is superseded by the older.

Return a single JSON object: {"pairs": [{"old_id": "<uuid>", "new_id": "<uuid>", "reason": "<one short sentence>"}]}.

If no supersedes apply, return {"pairs": []}.

Output only the JSON object. No prose, no markdown, no commentary.`;

// packages/daemon/src/agents/claude.ts
var VALID_KINDS = new Set([
  "bugfix",
  "feature",
  "discovery",
  "decision",
  "preference",
  "constraint",
  "security_alert",
  "reference",
  "summary",
  "note"
]);
function detectAuthMode() {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN)
    return "oauth-token";
  if (process.env.ANTHROPIC_API_KEY)
    return "api-key";
  return "subprocess";
}
function buildExtractPrompt(captures) {
  const blocks = captures.map((c, i) => {
    const header = [
      `Capture ${i + 1}:`,
      c.repo ? `repo: ${c.repo}` : null,
      c.session_id ? `session: ${c.session_id}` : null
    ].filter(Boolean).join(" | ");
    return `${header}
${c.content}`;
  }).join(`

---

`);
  return `Extract observations from the following captures.

${blocks}

Return JSON only.`;
}
function buildClusterPrompt(memories) {
  const lines = memories.map((m, i) => `${i + 1}. (${m.kind}) ${m.content}`);
  return `Distill the following cluster of related memories.

${lines.join(`
`)}

Return JSON only.`;
}
function buildSupersedePrompt(candidates) {
  const lines = candidates.map((m) => `id=${m.id} kind=${m.kind} created_at=${m.created_at}: ${m.content}`);
  return `Review the following memories for supersede relationships.

${lines.join(`
`)}

Return JSON only.`;
}
function parseSupersedeResponse(text) {
  let parsed;
  try {
    parsed = JSON.parse(extractJsonBlock(text));
  } catch {
    return [];
  }
  const pairs = parsed.pairs;
  if (!Array.isArray(pairs))
    return [];
  const result = [];
  for (const raw of pairs) {
    if (!raw || typeof raw !== "object")
      continue;
    const r = raw;
    if (typeof r.old_id !== "string" || typeof r.new_id !== "string" || typeof r.reason !== "string") {
      continue;
    }
    if (r.old_id === r.new_id)
      continue;
    result.push({
      old_id: r.old_id,
      new_id: r.new_id,
      reason: r.reason
    });
  }
  return result;
}
function extractJsonBlock(text) {
  const trimmed = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const fenceMatch = trimmed.match(fence);
  if (fenceMatch)
    return fenceMatch[1].trim();
  const start = trimmed.indexOf("{");
  if (start === -1)
    return trimmed;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start;i < trimmed.length; i++) {
    const ch = trimmed[i];
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
    if (inString)
      continue;
    if (ch === "{")
      depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0)
        return trimmed.slice(start, i + 1);
    }
  }
  return trimmed;
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function parseExtractResponse(text) {
  let parsed;
  try {
    parsed = JSON.parse(extractJsonBlock(text));
  } catch {
    return [];
  }
  const obs = parsed.observations;
  if (!Array.isArray(obs))
    return [];
  const result = [];
  for (const raw of obs) {
    if (!raw || typeof raw !== "object")
      continue;
    const r = raw;
    if (typeof r.content !== "string" || !r.content.trim())
      continue;
    if (typeof r.kind !== "string" || !VALID_KINDS.has(r.kind))
      continue;
    const importance = typeof r.importance === "number" ? clamp(r.importance, 0.1, 1) : 0.5;
    const topics = Array.isArray(r.topics) ? r.topics.filter((t) => typeof t === "string") : [];
    result.push({
      content: r.content.trim(),
      kind: r.kind,
      importance,
      topics
    });
  }
  return result;
}
function parseClusterResponse(text) {
  let parsed;
  try {
    parsed = JSON.parse(extractJsonBlock(text));
  } catch {
    return null;
  }
  const p = parsed;
  if (typeof p.title !== "string" || typeof p.summary !== "string")
    return null;
  return { title: p.title.trim(), summary: p.summary.trim() };
}
function findClaudeExecutable2() {
  if (process.env.CLAUDE_EXECUTABLE_PATH) {
    return process.env.CLAUDE_EXECUTABLE_PATH;
  }
  const which = spawnSync2("which", ["claude"], { encoding: "utf8" });
  const fromPath = which.stdout?.trim();
  if (fromPath && existsSync2(fromPath))
    return fromPath;
  const fallbacks = [
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
    `${homedir2()}/.local/bin/claude`,
    `${homedir2()}/.bun/bin/claude`
  ];
  for (const candidate of fallbacks) {
    if (existsSync2(candidate))
      return candidate;
  }
  throw new Error("claude executable not found. Install Claude Code or set CLAUDE_EXECUTABLE_PATH.");
}
var DISALLOWED_TOOLS2 = [
  "Bash",
  "Read",
  "Write",
  "Edit",
  "Grep",
  "Glob",
  "WebFetch",
  "WebSearch",
  "Task",
  "TodoWrite"
];
var EXTRACT_MODEL = "haiku";
var DREAM_MODEL = "sonnet";
async function callClaude(prompt, model, systemPrompt) {
  if (streamingEnabled()) {
    return streamingCallClaude(prompt, model, systemPrompt);
  }
  return callClaudeOneShot(prompt, model, systemPrompt);
}
async function callClaudeOneShot(prompt, model, systemPrompt) {
  const messages = query2({
    prompt,
    options: {
      model,
      systemPrompt,
      pathToClaudeCodeExecutable: findClaudeExecutable2(),
      disallowedTools: DISALLOWED_TOOLS2,
      mcpServers: {},
      settingSources: [],
      strictMcpConfig: true,
      includePartialMessages: false
    }
  });
  let response = "";
  let errorReason = null;
  for await (const msg of messages) {
    if (msg.type === "assistant") {
      if (msg.error) {
        errorReason = msg.error;
        continue;
      }
      const content = msg.message.content;
      if (typeof content === "string") {
        response += content;
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block && typeof block === "object" && block.type === "text" && typeof block.text === "string") {
            response += block.text;
          }
        }
      }
    } else if (msg.type === "result") {
      if (msg.subtype !== "success") {
        const detail = msg.error ?? msg.subtype;
        throw new Error(`claude SDK result not success: ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 200)}`);
      }
      break;
    }
  }
  if (errorReason && !response.trim()) {
    throw new Error(`claude SDK assistant error: ${errorReason}`);
  }
  return response;
}
function authDetail(mode) {
  switch (mode) {
    case "oauth-token":
      return "SDK + CLAUDE_CODE_OAUTH_TOKEN (Max subscription)";
    case "api-key":
      return "SDK + ANTHROPIC_API_KEY (pay-per-token)";
    case "subprocess":
      return "SDK + claude CLI subprocess (Max subscription, OAuth inherited)";
  }
}
var claudeProvider = {
  name: "claude",
  async isAvailable() {
    const mode = detectAuthMode();
    return { available: true, detail: authDetail(mode) };
  },
  async extract({ captures }) {
    if (captures.length === 0)
      return [];
    const prompt = buildExtractPrompt(captures);
    const response = await callClaude(prompt, EXTRACT_MODEL, SYSTEM_PROMPT);
    if (process.env.MNEME_DEBUG_LLM === "1") {
      console.log(`[claude.extract] response (${response.length} chars):
${response.slice(0, 800)}`);
    }
    return parseExtractResponse(response);
  },
  async distill(cluster) {
    const prompt = buildClusterPrompt(cluster);
    const response = await callClaude(prompt, DREAM_MODEL, CLUSTER_PROMPT);
    const parsed = parseClusterResponse(response);
    if (!parsed) {
      throw new Error("claude.distill: failed to parse cluster response");
    }
    return { title: parsed.title, summary: parsed.summary };
  },
  async findSupersedes(candidates) {
    if (candidates.length < 2)
      return [];
    const prompt = buildSupersedePrompt(candidates);
    const response = await callClaude(prompt, DREAM_MODEL, SUPERSEDE_PROMPT);
    return parseSupersedeResponse(response);
  },
  supportsDream() {
    return true;
  }
};

// packages/daemon/src/agents/index.ts
var REGISTRY = {
  claude: claudeProvider
};
function pickAgent(name) {
  const provider = REGISTRY[name];
  if (!provider) {
    throw new Error(`unknown agent provider: "${name}". Available: ${listAgents().join(", ")}`);
  }
  return provider;
}
function listAgents() {
  return Object.keys(REGISTRY);
}

// packages/daemon/src/dream-outbox.ts
import { mkdir, readFile, readdir, rename, rm, rmdir, writeFile } from "fs/promises";
import { join } from "path";
var STAGES = ["distilled", "embedded", "failed"];
function clusterFile(root, windowKey, stage, clusterId) {
  return join(root, String(windowKey), stage, `${clusterId}.json`);
}
async function atomicWrite(path, payload) {
  const dir = path.substring(0, path.lastIndexOf("/"));
  const name = path.substring(path.lastIndexOf("/") + 1);
  const tmp = join(dir, `.${name}.tmp`);
  await mkdir(dir, { recursive: true });
  await writeFile(tmp, JSON.stringify(payload));
  await rename(tmp, path);
}
function createDreamOutbox(rootPath) {
  async function ensureWindow(windowKey) {
    for (const stage of STAGES) {
      await mkdir(join(rootPath, String(windowKey), stage), { recursive: true });
    }
  }
  return {
    root: rootPath,
    async put(windowKey, stage, cluster) {
      await ensureWindow(windowKey);
      await atomicWrite(clusterFile(rootPath, windowKey, stage, cluster.cluster_id), cluster);
    },
    async transition(windowKey, from, to, cluster) {
      await ensureWindow(windowKey);
      const src = clusterFile(rootPath, windowKey, from, cluster.cluster_id);
      await readFile(src);
      await atomicWrite(clusterFile(rootPath, windowKey, to, cluster.cluster_id), cluster);
      await rm(src);
    },
    async list(windowKey, stage) {
      try {
        const entries = await readdir(join(rootPath, String(windowKey), stage));
        return entries.filter((f) => !f.startsWith(".") && f.endsWith(".json")).map((f) => f.slice(0, -".json".length));
      } catch (err) {
        if (err.code === "ENOENT")
          return [];
        throw err;
      }
    },
    async read(windowKey, stage, clusterId) {
      const buf = await readFile(clusterFile(rootPath, windowKey, stage, clusterId), "utf8");
      return JSON.parse(buf);
    },
    async delete(windowKey, stage, clusterId) {
      await rm(clusterFile(rootPath, windowKey, stage, clusterId), {
        force: true
      });
    },
    async markFailed(windowKey, from, clusterId, reason) {
      await ensureWindow(windowKey);
      const src = clusterFile(rootPath, windowKey, from, clusterId);
      const cluster = JSON.parse(await readFile(src, "utf8"));
      await atomicWrite(clusterFile(rootPath, windowKey, "failed", clusterId), cluster);
      await writeFile(join(rootPath, String(windowKey), "failed", `${clusterId}.error.txt`), reason);
      await rm(src);
    },
    async listWindows() {
      try {
        const entries = await readdir(rootPath);
        return entries.filter((d) => /^\d+$/.test(d)).map((d) => Number(d)).sort((a, b) => a - b);
      } catch (err) {
        if (err.code === "ENOENT")
          return [];
        throw err;
      }
    },
    async cleanupWindow(windowKey) {
      const distilled = await this.list(windowKey, "distilled");
      const embedded = await this.list(windowKey, "embedded");
      const failed = await this.list(windowKey, "failed");
      if (distilled.length > 0 || embedded.length > 0 || failed.length > 0) {
        return;
      }
      for (const stage of STAGES) {
        try {
          await rmdir(join(rootPath, String(windowKey), stage));
        } catch {}
      }
      try {
        await rmdir(join(rootPath, String(windowKey)));
      } catch {}
    }
  };
}
async function clusterIdFor(memberIds) {
  const sorted = [...memberIds].sort();
  const joined = sorted.join(",");
  const buf = new TextEncoder().encode(joined);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const b of bytes)
    hex += b.toString(16).padStart(2, "0");
  return hex;
}

// packages/daemon/src/dream.ts
var WINDOW_HOURS = 8;
var WINDOW_SECONDS = WINDOW_HOURS * 3600;
var WINDOW_MINUTES = WINDOW_HOURS * 60;
var MIN_CLUSTER_SIZE = 3;
var MAX_CLUSTER_SIZE = 20;
function computeWindowKey(date = new Date) {
  return Math.floor(date.getTime() / 1000 / WINDOW_SECONDS);
}
function buildComponents(nodes, edges) {
  const parent = new Map;
  for (const id of nodes)
    parent.set(id, id);
  const find = (x) => {
    let root = x;
    while (parent.get(root) !== root)
      root = parent.get(root);
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur);
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb)
      parent.set(ra, rb);
  };
  for (const [a, b] of edges) {
    if (parent.has(a) && parent.has(b))
      union(a, b);
  }
  const groups = new Map;
  for (const id of nodes) {
    const root = find(id);
    const list = groups.get(root);
    if (list)
      list.push(id);
    else
      groups.set(root, [id]);
  }
  return [...groups.values()];
}
async function lockWindow(deps, windowKey) {
  const response = await deps.fetch(`${deps.serverUrl}/api/dream/lock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deps.token}`
    },
    body: JSON.stringify({ window_key: windowKey })
  });
  if (response.status === 200)
    return { acquired: true };
  if (response.status === 409) {
    const body = await response.json().catch(() => ({}));
    return { acquired: false, heldBy: body.heldBy };
  }
  const detail = await response.text().catch(() => "");
  throw new Error(`lock returned ${response.status}: ${detail.slice(0, 500)}`);
}
async function fetchCandidates(deps, windowKey) {
  const url = `${deps.serverUrl}/api/dream/candidates?window_key=${windowKey}`;
  const response = await deps.fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${deps.token}` }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`candidates returned ${response.status}: ${detail.slice(0, 500)}`);
  }
  return await response.json();
}
async function submitClusters(deps, windowKey, clusters) {
  const response = await deps.fetch(`${deps.serverUrl}/api/dream/clusters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deps.token}`
    },
    body: JSON.stringify({ window_key: windowKey, clusters })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`clusters returned ${response.status}: ${detail.slice(0, 500)}`);
  }
  return await response.json();
}
async function runDreamCycle(deps) {
  const windowKey = deps.windowKey ?? computeWindowKey();
  Logger.info("dream: attempting lock", { window_key: windowKey });
  const lock = await lockWindow(deps, windowKey);
  if (!lock.acquired) {
    Logger.info("dream: skipped (lock held)", {
      window_key: windowKey,
      held_by: lock.heldBy ?? "unknown"
    });
    return { skipped: true, reason: `held by ${lock.heldBy ?? "unknown"}` };
  }
  Logger.info("dream: lock acquired", { window_key: windowKey });
  const candidates = await fetchCandidates(deps, windowKey);
  const repoCount = Object.keys(candidates.repos).length;
  const seedCount = Object.values(candidates.repos).reduce((sum, r) => sum + r.seeds.length, 0);
  Logger.info("dream: candidates fetched", {
    repos: repoCount,
    seeds: seedCount
  });
  const distilledClusters = [];
  for (const [repo, repoData] of Object.entries(candidates.repos)) {
    const seedById = new Map;
    for (const s of repoData.seeds)
      seedById.set(s.id, s);
    const components = buildComponents([...seedById.keys()], repoData.edges);
    const eligible = components.filter((c) => c.length >= MIN_CLUSTER_SIZE && c.length <= MAX_CLUSTER_SIZE);
    if (eligible.length > 0) {
      Logger.info("dream: clusters found in repo", {
        repo,
        components: components.length,
        eligible: eligible.length
      });
    }
    for (const memberIds of components) {
      if (memberIds.length < MIN_CLUSTER_SIZE || memberIds.length > MAX_CLUSTER_SIZE) {
        continue;
      }
      const cluster_id = await clusterIdFor(memberIds);
      if (deps.outbox) {
        const existsDistilled = (await deps.outbox.list(windowKey, "distilled")).includes(cluster_id);
        const existsEmbedded = (await deps.outbox.list(windowKey, "embedded")).includes(cluster_id);
        if (existsDistilled || existsEmbedded) {
          Logger.info("dream: cluster already persisted, skipping distill", {
            size: memberIds.length,
            stage: existsEmbedded ? "embedded" : "distilled"
          });
          const stage = existsEmbedded ? "embedded" : "distilled";
          distilledClusters.push(await deps.outbox.read(windowKey, stage, cluster_id));
          continue;
        }
      }
      const memberMemories = memberIds.map((id) => {
        const s = seedById.get(id);
        return {
          content: s.content,
          content_hash: "",
          chunk_id: "",
          kind: s.kind,
          importance: 0.6,
          topics: [],
          meta: {}
        };
      });
      Logger.info("dream: distilling cluster", { size: memberIds.length });
      const tDistill = Date.now();
      try {
        const distilled = await deps.distill(memberMemories);
        Logger.info("dream: distilled", {
          size: memberIds.length,
          title: distilled.title,
          ms: Date.now() - tDistill
        });
        let supersede_pairs;
        if (deps.findSupersedes && memberIds.length >= 2) {
          try {
            const candidates2 = memberIds.map((id) => {
              const s = seedById.get(id);
              return {
                id,
                content: s.content,
                kind: s.kind,
                created_at: s.created_at
              };
            });
            supersede_pairs = await deps.findSupersedes(candidates2);
          } catch (err) {
            Logger.warn("dream supersede pass failed", err, { memberIds });
          }
        }
        const cluster = {
          cluster_id,
          member_ids: memberIds,
          title: distilled.title,
          summary: distilled.summary,
          ...supersede_pairs && supersede_pairs.length ? { supersede_pairs } : {}
        };
        if (deps.outbox) {
          await deps.outbox.put(windowKey, "distilled", cluster);
        }
        distilledClusters.push(cluster);
      } catch (err) {
        Logger.warn("dream distill failed for cluster", err, { memberIds });
      }
    }
  }
  for (const cluster of distilledClusters) {
    if (cluster.summary_embedding)
      continue;
    if (!deps.embed)
      continue;
    try {
      const [vec] = await deps.embed([cluster.summary]);
      if (vec)
        cluster.summary_embedding = vec;
    } catch (err) {
      Logger.warn("dream: cluster summary embed failed", err, {
        cluster_id: cluster.cluster_id
      });
    }
    if (deps.outbox) {
      await deps.outbox.transition(windowKey, "distilled", "embedded", cluster);
    }
  }
  const submissions = distilledClusters.map((c) => ({
    member_ids: c.member_ids,
    title: c.title,
    summary: c.summary,
    ...c.summary_embedding ? { summary_embedding: c.summary_embedding } : {},
    ...c.supersede_pairs && c.supersede_pairs.length ? { supersede_pairs: c.supersede_pairs } : {}
  }));
  Logger.info("dream: submitting clusters", { count: submissions.length });
  const result = await submitClusters(deps, windowKey, submissions);
  Logger.info("dream: clusters written", {
    submitted: submissions.length,
    written: result.written,
    supersedes: result.supersedes
  });
  if (deps.outbox) {
    for (const cluster of distilledClusters) {
      await deps.outbox.delete(windowKey, "embedded", cluster.cluster_id);
    }
    await deps.outbox.cleanupWindow(windowKey);
  }
  return {
    skipped: false,
    clustersSubmitted: submissions.length,
    clustersWritten: result.written
  };
}
async function resumeDreamCycles(deps) {
  if (!deps.outbox)
    return { resumed: 0, written: 0 };
  const windows = await deps.outbox.listWindows();
  let resumedClusters = 0;
  let writtenClusters = 0;
  for (const windowKey of windows) {
    const distilledIds = await deps.outbox.list(windowKey, "distilled");
    const embeddedIds = await deps.outbox.list(windowKey, "embedded");
    const totalQueued = distilledIds.length + embeddedIds.length;
    if (totalQueued === 0) {
      await deps.outbox.cleanupWindow(windowKey);
      continue;
    }
    Logger.info("dream: resuming window", {
      window_key: windowKey,
      distilled: distilledIds.length,
      embedded: embeddedIds.length
    });
    for (const id of distilledIds) {
      const cluster = await deps.outbox.read(windowKey, "distilled", id);
      if (!cluster.summary_embedding && deps.embed) {
        try {
          const [vec] = await deps.embed([cluster.summary]);
          if (vec)
            cluster.summary_embedding = vec;
        } catch (err) {
          Logger.warn("dream: resume embed failed", err, { cluster_id: id });
        }
      }
      await deps.outbox.transition(windowKey, "distilled", "embedded", cluster);
    }
    const allIds = await deps.outbox.list(windowKey, "embedded");
    const clusters = [];
    for (const id of allIds) {
      clusters.push(await deps.outbox.read(windowKey, "embedded", id));
    }
    const submissions = clusters.map((c) => ({
      member_ids: c.member_ids,
      title: c.title,
      summary: c.summary,
      ...c.summary_embedding ? { summary_embedding: c.summary_embedding } : {},
      ...c.supersede_pairs && c.supersede_pairs.length ? { supersede_pairs: c.supersede_pairs } : {}
    }));
    try {
      const result = await submitClusters({ ...deps, distill: () => Promise.reject(new Error("not used")) }, windowKey, submissions);
      Logger.info("dream: resume submitted", {
        window_key: windowKey,
        submitted: submissions.length,
        written: result.written
      });
      resumedClusters += submissions.length;
      writtenClusters += result.written;
      for (const id of allIds) {
        await deps.outbox.delete(windowKey, "embedded", id);
      }
      await deps.outbox.cleanupWindow(windowKey);
    } catch (err) {
      Logger.warn("dream: resume submit failed, files retained", err, {
        window_key: windowKey
      });
    }
  }
  return { resumed: resumedClusters, written: writtenClusters };
}

// packages/daemon/src/embed.ts
var EMBEDDER_MODEL = "BAAI/bge-large-en-v1.5";
var TRANSFORMERS_MODEL_ID = "Xenova/bge-large-en-v1.5";
var PIPELINE_IDLE_MS = 60 * 1000;
var pipelinePromise = null;
var lastUsedAt = 0;
async function getPipeline() {
  if (!pipelinePromise) {
    Logger.info("embedder: loading pipeline", { model: EMBEDDER_MODEL });
    const { pipeline, env: tfEnv } = await import("@xenova/transformers");
    if (process.env.MNEME_EMBED_FULL_PREC !== "1") {
      tfEnv.useBrowserCache = false;
      tfEnv.allowLocalModels = false;
    }
    pipelinePromise = pipeline("feature-extraction", TRANSFORMERS_MODEL_ID, {
      quantized: process.env.MNEME_EMBED_FULL_PREC !== "1"
    });
  }
  lastUsedAt = Date.now();
  return pipelinePromise;
}
async function disposeIfIdle(idleMs = PIPELINE_IDLE_MS) {
  if (!pipelinePromise)
    return false;
  if (Date.now() - lastUsedAt < idleMs)
    return false;
  Logger.info("embedder: disposing idle pipeline", {
    idle_seconds: Math.round((Date.now() - lastUsedAt) / 1000)
  });
  try {
    const p = await pipelinePromise;
    const dispose = p.dispose;
    if (typeof dispose === "function") {
      await dispose.call(p);
    }
  } catch (err) {
    Logger.warn("embedder: pipeline.dispose threw, dropping reference anyway", { err: err instanceof Error ? err.message : String(err) });
  }
  pipelinePromise = null;
  if (typeof Bun !== "undefined" && Bun.gc)
    Bun.gc(true);
  return true;
}
async function embedBatch(texts) {
  if (texts.length === 0)
    return [];
  const extractor = await getPipeline();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  const flat = output.tolist();
  return flat;
}

// packages/daemon/src/outbox.ts
import { existsSync as existsSync3 } from "fs";
import {
  mkdir as mkdir2,
  readFile as readFile2,
  readdir as readdir2,
  rename as rename2,
  rm as rm2,
  writeFile as writeFile2
} from "fs/promises";
import { join as join2 } from "path";
var STATES = [
  "captured",
  "observations",
  "embedded",
  "failed"
];
var LEGACY_MOVES = [
  { from: "pending", to: "captured" },
  { from: "extracted", to: "observations" }
];
function fileFor(root, state, id) {
  return join2(root, state, `${id}.json`);
}
async function atomicWrite2(path, data) {
  const dir = path.substring(0, path.lastIndexOf("/"));
  const name = path.substring(path.lastIndexOf("/") + 1);
  const tmp = join2(dir, `.${name}.tmp`);
  await writeFile2(tmp, JSON.stringify(data));
  await rename2(tmp, path);
}
function createOutbox(rootPath) {
  let initialized = false;
  async function migrateLegacy() {
    for (const { from, to } of LEGACY_MOVES) {
      const oldDir = join2(rootPath, from);
      const newDir = join2(rootPath, to);
      if (!existsSync3(oldDir))
        continue;
      if (!existsSync3(newDir)) {
        await rename2(oldDir, newDir);
      } else {
        const entries = await readdir2(oldDir);
        for (const f of entries) {
          await rename2(join2(oldDir, f), join2(newDir, f));
        }
        await rm2(oldDir, { recursive: true, force: true });
      }
    }
  }
  async function ensureDirs() {
    if (initialized)
      return;
    await migrateLegacy();
    for (const state of STATES) {
      await mkdir2(join2(rootPath, state), { recursive: true });
    }
    initialized = true;
  }
  return {
    root: rootPath,
    async writeRaw(id, data) {
      await ensureDirs();
      await atomicWrite2(fileFor(rootPath, "captured", id), data);
    },
    async list(state) {
      await ensureDirs();
      const entries = await readdir2(join2(rootPath, state));
      return entries.filter((f) => !f.startsWith(".") && f.endsWith(".json")).map((f) => f.slice(0, -".json".length));
    },
    async read(id, state) {
      const buf = await readFile2(fileFor(rootPath, state, id), "utf8");
      return JSON.parse(buf);
    },
    async transition(id, from, to, newData) {
      await ensureDirs();
      const src = fileFor(rootPath, from, id);
      await readFile2(src);
      await atomicWrite2(fileFor(rootPath, to, id), newData);
      await rm2(src);
    },
    async delete(id, state) {
      await rm2(fileFor(rootPath, state, id), { force: true });
    },
    async markFailed(id, from, reason) {
      await ensureDirs();
      const src = fileFor(rootPath, from, id);
      const data = JSON.parse(await readFile2(src, "utf8"));
      await atomicWrite2(fileFor(rootPath, "failed", id), data);
      await writeFile2(join2(rootPath, "failed", `${id}.error.txt`), reason);
      await rm2(src);
    }
  };
}

// packages/daemon/src/routes/capture.ts
function mountCaptureRoute(app, runtime) {
  app.post("/capture", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body)
      return c.json({ error: "invalid_json" }, 400);
    const result = await runtime.handleCapture(body);
    if (!result.ok)
      return c.json({ error: result.error }, 400);
    return c.json({ id: result.id });
  });
}

// packages/daemon/src/routes/dream.ts
function mountDreamRoute(app, runDream) {
  app.post("/dream/run", async (c) => {
    try {
      const result = await runDream();
      Logger.info("dream cycle (manual)", result);
      return c.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.error("dream cycle (manual) failed", err);
      return c.json({ error: msg }, 500);
    }
  });
}

// packages/daemon/src/routes/embed.ts
function mountEmbedRoute(app) {
  app.post("/embed", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || !Array.isArray(body.texts)) {
      Logger.warn("embed: invalid body");
      return c.json({ error: "texts[] required" }, 400);
    }
    const texts = body.texts.filter((t) => typeof t === "string");
    Logger.info("embed request", { count: texts.length });
    try {
      const t0 = Date.now();
      const vectors = await embedBatch(texts);
      Logger.info("embed result", {
        count: vectors.length,
        duration_ms: Date.now() - t0
      });
      return c.json({ vectors });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.error("embed failed", err, { count: texts.length });
      return c.json({ error: msg }, 500);
    }
  });
}

// packages/daemon/src/routes/ops.ts
function mountOpsRoutes(app, runtime) {
  app.get("/health", (c) => c.json({ ok: true }));
  app.post("/flush", (c) => {
    runtime.flush().catch((err) => {
      Logger.error("flush failed", err);
    });
    return c.json({ ok: true, accepted: true }, 202);
  });
}

// packages/daemon/src/runtime.ts
import { existsSync as existsSync4 } from "fs";
import { appendFile, mkdir as mkdir3, readFile as fsReadFile } from "fs/promises";
import { homedir as homedir3 } from "os";
import { join as join3 } from "path";

// packages/shared/src/scrub.ts
var SECRET_PATTERNS = [
  { name: "aws_access_key", re: /AKIA[0-9A-Z]{16}/g },
  { name: "github_pat_classic", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g },
  { name: "github_pat_fine", re: /\bgithub_pat_[A-Za-z0-9_]{82,}\b/g },
  { name: "anthropic_key", re: /\bsk-ant-(?:api\d{2}-)?[A-Za-z0-9_-]{40,}\b/g },
  { name: "openai_key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/g },
  { name: "groq_key", re: /\bgsk_[A-Za-z0-9]{40,}\b/g },
  { name: "voyage_key", re: /\bpa-[A-Za-z0-9_-]{40,}\b/g },
  { name: "slack_token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "jwt", re: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
  { name: "bearer_header", re: /\b[Bb]earer\s+[A-Za-z0-9_\-.=]{20,}/g },
  {
    name: "ssh_private_key",
    re: /-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*?-----END[A-Z ]*PRIVATE KEY-----/g
  },
  {
    name: "url_userinfo",
    re: /(?<=\b[a-zA-Z][a-zA-Z0-9+.-]{0,30}:\/\/)[^\s/@:]+:[^\s/@]+(?=@)/g
  }
];
var PRIVATE_TAG_RE = /<private[^>]*>[\s\S]*?<\/private>/gi;
function scrub(input) {
  if (!input)
    return input;
  let out = input.replace(PRIVATE_TAG_RE, "[private redacted]");
  for (const { name, re } of SECRET_PATTERNS) {
    out = out.replace(re, `[REDACTED:${name}]`);
  }
  return out;
}
function scrubData(data) {
  if (typeof data === "string")
    return scrub(data);
  if (Array.isArray(data))
    return data.map(scrubData);
  if (data && typeof data === "object") {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = scrubData(v);
    }
    return out;
  }
  return data;
}
// packages/daemon/src/runtime.ts
var REQUIRED_STRING_FIELDS = [
  "content",
  "source",
  "hostname",
  "harness"
];
var COALESCE_WINDOW_MS = 5 * 60 * 1000;
var MAX_BATCH_SIZE = 20;
var DEFAULT_EXTRACT_BATCH_FULL = 1;
var DEFAULT_EXTRACT_IDLE_MS = 0;
var DEFAULT_EXTRACT_FORCE_MS = 0;
async function sha256Hex(input) {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const b of bytes)
    hex += b.toString(16).padStart(2, "0");
  return hex;
}
function scrubCapture(body) {
  return {
    content: scrub(body.content),
    source: scrub(body.source),
    hostname: scrub(body.hostname),
    repo: body.repo ? scrub(body.repo) : null,
    harness: scrub(body.harness),
    agent: body.agent ? scrub(body.agent) : null,
    session_id: body.session_id ? scrub(body.session_id) : null,
    topics: (body.topics ?? []).map(scrub),
    private: !!body.private,
    raw_meta: scrubData(body.raw_meta ?? {})
  };
}
function asPermanent(err) {
  return err !== null && typeof err === "object" && err.permanent === true;
}
function createRuntime(deps) {
  const embedderModel = deps.embedderModel ?? EMBEDDER_MODEL;
  const batchFull = deps.extractBatchFull ?? DEFAULT_EXTRACT_BATCH_FULL;
  const idleMs = deps.extractIdleMs ?? DEFAULT_EXTRACT_IDLE_MS;
  const forceMs = deps.extractForceMs ?? DEFAULT_EXTRACT_FORCE_MS;
  const now = deps.now ?? (() => Date.now());
  let lastCapturedWriteAt = now();
  async function handleCapture(body) {
    for (const field of REQUIRED_STRING_FIELDS) {
      const v = body[field];
      if (typeof v !== "string" || !v.trim()) {
        return { ok: false, error: `${field} required` };
      }
    }
    const cleaned = scrubCapture(body);
    const hash = await sha256Hex(cleaned.content);
    const id = `${Date.now()}-${hash.slice(0, 8)}`;
    await deps.outbox.writeRaw(id, cleaned);
    lastCapturedWriteAt = now();
    return { ok: true, id };
  }
  const PUSH_CONCURRENCY = 4;
  const EMBED_BATCH_CAP = 64;
  async function runBatchedEmbed() {
    const ids = await deps.outbox.list("observations");
    if (ids.length === 0)
      return;
    const loaded = [];
    for (const id of ids) {
      try {
        const data = await deps.outbox.read(id, "observations");
        loaded.push({ id, capture: data.capture, memories: data.memories });
      } catch {}
    }
    if (loaded.length === 0)
      return;
    const flatTexts = [];
    const origin = [];
    for (let f = 0;f < loaded.length; f++) {
      const memories = loaded[f].memories;
      for (let m = 0;m < memories.length; m++) {
        flatTexts.push(memories[m].content);
        origin.push({ fileIdx: f, memIdx: m });
      }
    }
    const allVectors = [];
    if (flatTexts.length > 0) {
      for (let i = 0;i < flatTexts.length; i += EMBED_BATCH_CAP) {
        const chunk = flatTexts.slice(i, i + EMBED_BATCH_CAP);
        const part = await deps.embed(chunk);
        allVectors.push(...part);
      }
    }
    for (let f = 0;f < loaded.length; f++) {
      const file = loaded[f];
      const enriched = [];
      for (let m = 0;m < file.memories.length; m++) {
        const mem = file.memories[m];
        const flatIdx = origin.findIndex((o) => o.fileIdx === f && o.memIdx === m);
        const vector = flatIdx >= 0 ? allVectors[flatIdx] : undefined;
        const contentHash = await sha256Hex(mem.content);
        const chunkId = await sha256Hex(`${contentHash}:${embedderModel}`);
        enriched.push({
          ...mem,
          content_hash: contentHash,
          chunk_id: chunkId,
          embedding: vector,
          embedding_model: embedderModel,
          meta: {
            extractor_provider: "anthropic",
            extractor_model: "claude-haiku"
          }
        });
      }
      try {
        await deps.outbox.transition(file.id, "observations", "embedded", {
          capture: file.capture,
          memories: enriched
        });
      } catch (err) {
        if (asPermanent(err)) {
          const reason = err instanceof Error ? err.message : String(err);
          await deps.outbox.markFailed(file.id, "observations", reason);
        }
      }
    }
  }
  async function runParallelPush() {
    const ids = await deps.outbox.list("embedded");
    if (ids.length === 0)
      return;
    for (let i = 0;i < ids.length; i += PUSH_CONCURRENCY) {
      const slice = ids.slice(i, i + PUSH_CONCURRENCY);
      await Promise.all(slice.map(async (id) => {
        let data;
        try {
          data = await deps.outbox.read(id, "embedded");
        } catch {
          return;
        }
        try {
          const stage = data;
          const captureSha = await sha256Hex(stage.capture.content);
          const bundle = {
            capture: { ...stage.capture, content_sha256: captureSha },
            memories: stage.memories
          };
          await deps.push(bundle);
          await deps.outbox.delete(id, "embedded");
          Logger.info("bundle pushed", {
            id,
            memories: stage.memories.length
          });
        } catch (err) {
          if (asPermanent(err)) {
            const reason = err instanceof Error ? err.message : String(err);
            await deps.outbox.markFailed(id, "embedded", reason);
          }
        }
      }));
    }
  }
  const SHAS_DIR = deps.shasDir ?? join3(homedir3(), ".mneme", "shas");
  function shasFile(sessionId) {
    return join3(SHAS_DIR, `${sessionId}.txt`);
  }
  async function loadSessionLedger(sessionId) {
    const file = shasFile(sessionId);
    if (!existsSync4(file))
      return new Set;
    try {
      const buf = await fsReadFile(file, "utf8");
      return new Set(buf.split(`
`).filter(Boolean));
    } catch {
      return new Set;
    }
  }
  async function appendLedger(sessionId, keys) {
    if (keys.length === 0)
      return;
    try {
      if (!existsSync4(SHAS_DIR)) {
        await mkdir3(SHAS_DIR, { recursive: true, mode: 448 });
      }
      await appendFile(shasFile(sessionId), `${keys.join(`
`)}
`, {
        mode: 384
      });
    } catch {}
  }
  async function runDedup() {
    const ids = await deps.outbox.list("captured");
    if (ids.length === 0)
      return { kept: 0, dropped: 0 };
    const entries = [];
    for (const id of ids) {
      try {
        const capture = await deps.outbox.read(id, "captured");
        const sessionId = capture.session_id ?? null;
        const contentSha = await sha256Hex(capture.content);
        const meta = capture.raw_meta ?? {};
        const uuid = typeof meta.message_uuid === "string" ? meta.message_uuid : null;
        entries.push({ id, sessionId, contentSha, uuid });
      } catch {
        continue;
      }
    }
    const ledgers = new Map;
    const seenInTick = new Map;
    let kept = 0;
    let dropped = 0;
    for (const e of entries) {
      if (!e.sessionId) {
        kept++;
        continue;
      }
      let ledger = ledgers.get(e.sessionId);
      if (!ledger) {
        ledger = await loadSessionLedger(e.sessionId);
        ledgers.set(e.sessionId, ledger);
      }
      let tickSeen = seenInTick.get(e.sessionId);
      if (!tickSeen) {
        tickSeen = new Set;
        seenInTick.set(e.sessionId, tickSeen);
      }
      const shaKey = `sha:${e.contentSha}`;
      const uuidKey = e.uuid ? `uuid:${e.uuid}` : null;
      const isDup = ledger.has(shaKey) || tickSeen.has(shaKey) || uuidKey !== null && (ledger.has(uuidKey) || tickSeen.has(uuidKey));
      if (isDup) {
        try {
          await deps.outbox.delete(e.id, "captured");
        } catch {}
        dropped++;
        continue;
      }
      tickSeen.add(shaKey);
      if (uuidKey)
        tickSeen.add(uuidKey);
      kept++;
    }
    if (dropped > 0) {
      Logger.info("dedup", { kept, dropped });
    }
    return { kept, dropped };
  }
  async function recordAcceptedKeys(captures) {
    const bySession = new Map;
    for (const c of captures) {
      if (!c.session_id)
        continue;
      const sha = await sha256Hex(c.content);
      const meta = c.raw_meta ?? {};
      const uuid = typeof meta.message_uuid === "string" ? meta.message_uuid : null;
      const arr = bySession.get(c.session_id) ?? [];
      arr.push(`sha:${sha}`);
      if (uuid)
        arr.push(`uuid:${uuid}`);
      bySession.set(c.session_id, arr);
    }
    for (const [sessionId, keys] of bySession) {
      await appendLedger(sessionId, keys);
    }
  }
  async function runCoalescedExtract() {
    const ids = await deps.outbox.list("captured");
    if (ids.length === 0)
      return;
    const tickNow = now();
    const oldestTs = ids.map((id) => {
      const m = id.match(/^(\d+)-/);
      return m ? Number(m[1]) : Infinity;
    }).reduce((a, b) => Math.min(a, b), Infinity);
    const isFull = ids.length >= batchFull;
    const isIdle = idleMs > 0 && tickNow - lastCapturedWriteAt >= idleMs;
    const isForced = forceMs > 0 && Number.isFinite(oldestTs) && tickNow - oldestTs >= forceMs;
    if (!isFull && !isIdle && !isForced) {
      return;
    }
    const entries = [];
    for (const id of ids) {
      try {
        const capture = await deps.outbox.read(id, "captured");
        const tsMatch = id.match(/^(\d+)-/);
        const ts = tsMatch ? Number(tsMatch[1]) : 0;
        entries.push({ id, ts, capture });
      } catch {
        continue;
      }
    }
    entries.sort((a, b) => a.ts - b.ts);
    const processed = new Set;
    for (const seed of entries) {
      if (processed.has(seed.id))
        continue;
      const batch = [seed];
      for (const candidate of entries) {
        if (candidate.id === seed.id)
          continue;
        if (processed.has(candidate.id))
          continue;
        if (batch.length >= MAX_BATCH_SIZE)
          break;
        const sameSession = candidate.capture.session_id === seed.capture.session_id;
        const sameRepo = candidate.capture.repo === seed.capture.repo;
        const samePrivate = candidate.capture.private === seed.capture.private;
        const inWindow = Math.abs(candidate.ts - seed.ts) <= COALESCE_WINDOW_MS;
        if (sameSession && sameRepo && samePrivate && inWindow) {
          batch.push(candidate);
        }
      }
      Logger.info("extract batch", {
        size: batch.length,
        session: seed.capture.session_id ?? null,
        repo: seed.capture.repo ?? null
      });
      let memories;
      try {
        memories = await deps.extract(batch.map((e) => e.capture));
        Logger.info("extract result", {
          observations: memories.length,
          captures: batch.length
        });
      } catch (err) {
        if (asPermanent(err)) {
          const reason = err instanceof Error ? err.message : String(err);
          for (const entry of batch) {
            try {
              await deps.outbox.markFailed(entry.id, "captured", reason);
              processed.add(entry.id);
            } catch {}
          }
        }
        continue;
      }
      const transitioned = [];
      for (let i = 0;i < batch.length; i++) {
        const entry = batch[i];
        const isSeed = i === 0;
        try {
          await deps.outbox.transition(entry.id, "captured", "observations", {
            capture: entry.capture,
            memories: isSeed ? memories : []
          });
          processed.add(entry.id);
          transitioned.push(entry);
        } catch (err) {
          if (asPermanent(err)) {
            const reason = err instanceof Error ? err.message : String(err);
            await deps.outbox.markFailed(entry.id, "captured", reason);
          }
        }
      }
      if (transitioned.length > 0) {
        await recordAcceptedKeys(transitioned.map((e) => ({
          session_id: e.capture.session_id ?? null,
          content: e.capture.content,
          raw_meta: e.capture.raw_meta ?? {}
        })));
      }
    }
  }
  async function runWorkerTick() {
    await runDedup();
    await runCoalescedExtract();
    await runBatchedEmbed();
    await runParallelPush();
  }
  async function flush() {
    lastCapturedWriteAt = 0;
    await runWorkerTick();
  }
  return { handleCapture, runWorkerTick, flush };
}

// packages/daemon/src/scheduler.ts
import { mkdir as mkdir4, readFile as readFile3, rename as rename3, writeFile as writeFile3 } from "fs/promises";
import { homedir as homedir4 } from "os";
import { dirname, join as join4 } from "path";
var TICK_MS = 60000;
var STATE_PATH = join4(homedir4(), ".mneme", "schedule.json");
var STALE_NEW_JOB_SLACK_MS = 5 * 60000;
var registry = new Map;
var state = {};
var timer = null;
var stopped = false;
function register(job) {
  registry.set(job.name, job);
}
async function loadState() {
  try {
    const raw = await readFile3(STATE_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT")
      return {};
    throw err;
  }
}
async function saveState(s) {
  await mkdir4(dirname(STATE_PATH), { recursive: true });
  const tmp = `${STATE_PATH}.tmp`;
  await writeFile3(tmp, JSON.stringify(s, null, 2));
  await rename3(tmp, STATE_PATH);
}
function syncRegistry(s) {
  const out = {};
  const now = new Date().toISOString();
  for (const job of registry.values()) {
    const existing = s[job.name];
    if (existing) {
      out[job.name] = { ...existing, schedule_ms: job.scheduleMs };
    } else {
      out[job.name] = {
        schedule_ms: job.scheduleMs,
        next_run_at: now,
        last_run_at: null,
        last_status: null,
        last_error: null,
        last_duration_ms: null
      };
    }
  }
  return out;
}
function recoverStaleClaims(s) {
  const now = Date.now();
  const out = { ...s };
  let recovered = 0;
  for (const [name, row] of Object.entries(out)) {
    const nextRunAt = new Date(row.next_run_at).getTime();
    const lastRunAt = row.last_run_at ? new Date(row.last_run_at).getTime() : null;
    const stale = lastRunAt !== null && lastRunAt < nextRunAt - row.schedule_ms || lastRunAt === null && nextRunAt > now + STALE_NEW_JOB_SLACK_MS;
    if (stale) {
      out[name] = { ...row, next_run_at: new Date(now).toISOString() };
      recovered++;
    }
  }
  return { state: out, recovered };
}
async function tick() {
  if (stopped)
    return;
  const now = Date.now();
  const due = [];
  for (const job of registry.values()) {
    const row = state[job.name];
    if (!row)
      continue;
    if (new Date(row.next_run_at).getTime() > now)
      continue;
    state[job.name] = {
      ...row,
      next_run_at: new Date(now + job.scheduleMs).toISOString()
    };
    due.push(job.name);
  }
  if (due.length === 0)
    return;
  await saveState(state);
  for (const name of due) {
    const job = registry.get(name);
    if (!job)
      continue;
    const t0 = Date.now();
    let status = "ok";
    let errorMsg = null;
    try {
      await job.run();
    } catch (e) {
      status = "failed";
      errorMsg = e instanceof Error ? e.message : String(e);
      Logger.error("scheduler: job failed", e, { job: name });
    }
    const elapsed = Date.now() - t0;
    state[name] = {
      ...state[name],
      last_run_at: new Date().toISOString(),
      last_status: status,
      last_error: errorMsg,
      last_duration_ms: elapsed
    };
    await saveState(state);
    if (status === "ok") {
      Logger.info("scheduler: job ok", {
        job: name,
        elapsed_s: Number((elapsed / 1000).toFixed(1))
      });
    }
  }
}
async function startScheduler() {
  Logger.info("scheduler: starting", {
    jobs: [...registry.keys()],
    state_path: STATE_PATH,
    tick_s: TICK_MS / 1000
  });
  try {
    const loaded = await loadState();
    state = syncRegistry(loaded);
    const { state: recoveredState, recovered } = recoverStaleClaims(state);
    state = recoveredState;
    await saveState(state);
    if (recovered > 0) {
      Logger.info("scheduler: recovered stale claims", { count: recovered });
    }
  } catch (e) {
    Logger.error("scheduler: state init failed (will retry on next tick)", e);
  }
  timer = setInterval(() => {
    (async () => {
      try {
        await tick();
      } catch (e) {
        Logger.error("scheduler: tick crashed", e);
      }
    })();
  }, TICK_MS);
}

// packages/daemon/src/index.ts
var WORKER_TICK_MS = 2000;
var EXTRACT_BATCH_FULL = 50;
var EXTRACT_IDLE_MS = 2 * 60000;
var EXTRACT_FORCE_MS = 5 * 60000;
var DREAM_SCHEDULE_MS = 8 * 3600000;
var HEARTBEAT_SCHEDULE_MS = 60000;
var EMBEDDER_REAP_SCHEDULE_MS = 60000;
async function readConfig() {
  const path = join5(homedir5(), ".mneme", "config.json");
  const raw = await readFile4(path, "utf8");
  const shaped = JSON.parse(raw);
  if (!shaped.daemon) {
    throw new Error("config.json has no `daemon` section; run /mneme:setup to install the daemon service");
  }
  return {
    server_url: shaped.server.url.replace(/\/$/, ""),
    machine_id: shaped.machine.id,
    token: shaped.auth.key,
    daemon_port: shaped.daemon.port,
    agent_provider: shaped.daemon.agent_provider
  };
}
function pushBundleViaServer(serverUrl, token) {
  return async (bundle) => {
    const response = await fetch(`${serverUrl}/api/bundle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(bundle)
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const err = new Error(`push failed ${response.status}: ${detail.slice(0, 300)}`);
      if (response.status >= 400 && response.status < 500) {
        Object.assign(err, { permanent: true });
      }
      throw err;
    }
  };
}
async function migrateLegacyCaptureOutbox() {
  const root = join5(homedir5(), ".mneme", "outbox");
  const captureRoot = join5(root, "capture");
  if (existsSync5(captureRoot))
    return;
  const stages = ["pending", "extracted", "embedded", "failed"];
  const present = stages.filter((s) => existsSync5(join5(root, s)));
  if (present.length === 0)
    return;
  Logger.info("outbox: migrating legacy capture layout", { stages: present });
  await mkdir5(captureRoot, { recursive: true });
  for (const s of present) {
    await rename4(join5(root, s), join5(captureRoot, s));
  }
}
async function reclaimLegacyPluginOutbox() {
  const root = join5(homedir5(), ".mneme", "outbox");
  const pluginDir = join5(root, "plugin");
  if (!existsSync5(pluginDir))
    return;
  let entries;
  try {
    entries = await readdir3(pluginDir);
  } catch {
    return;
  }
  const stranded = entries.filter((e) => e.endsWith(".json"));
  const captureDir = join5(root, "capture", "pending");
  await mkdir5(captureDir, { recursive: true });
  for (const f of stranded) {
    const id = `${Date.now()}-${f.slice(0, 8)}.json`;
    await rename4(join5(pluginDir, f), join5(captureDir, id));
  }
  if (stranded.length > 0) {
    Logger.info("outbox: reclaimed stranded plugin captures into pending/", {
      count: stranded.length
    });
  }
  try {
    const { rmdir: rmdir2 } = await import("fs/promises");
    await rmdir2(pluginDir);
  } catch {}
}
async function startDaemon() {
  const config = await readConfig();
  await migrateLegacyCaptureOutbox();
  await reclaimLegacyPluginOutbox();
  const captureOutboxRoot = join5(homedir5(), ".mneme", "outbox", "capture");
  const dreamOutboxRoot = join5(homedir5(), ".mneme", "outbox", "dream");
  const outbox = createOutbox(captureOutboxRoot);
  const dreamOutbox = createDreamOutbox(dreamOutboxRoot);
  const agent = pickAgent(config.agent_provider);
  let lastProcessedAt = null;
  const realPush = pushBundleViaServer(config.server_url, config.token);
  const runtime = createRuntime({
    outbox,
    extract: (captures) => agent.extract({ captures }),
    embed: embedBatch,
    push: async (bundle) => {
      await realPush(bundle);
      lastProcessedAt = new Date;
    },
    extractBatchFull: EXTRACT_BATCH_FULL,
    extractIdleMs: EXTRACT_IDLE_MS,
    extractForceMs: EXTRACT_FORCE_MS
  });
  configureLogger({ jsonMode: false, minLevel: "debug" });
  Logger.info("daemon starting", {
    machine_id: config.machine_id,
    agent: config.agent_provider,
    capture_outbox: captureOutboxRoot,
    dream_outbox: dreamOutboxRoot,
    server: config.server_url
  });
  const runDream = () => runDreamCycle({
    serverUrl: config.server_url,
    token: config.token,
    machineId: config.machine_id,
    fetch: (u, init) => fetch(u, init),
    distill: (memories) => {
      if (!agent.distill) {
        throw new Error(`agent ${agent.name} does not support dream (no distill())`);
      }
      return agent.distill(memories);
    },
    embed: embedBatch,
    findSupersedes: agent.findSupersedes ? (candidates) => agent.findSupersedes(candidates) : undefined,
    outbox: dreamOutbox
  });
  try {
    const resumed = await resumeDreamCycles({
      serverUrl: config.server_url,
      token: config.token,
      machineId: config.machine_id,
      fetch: (u, init) => fetch(u, init),
      embed: embedBatch,
      outbox: dreamOutbox
    });
    if (resumed.resumed > 0) {
      Logger.info("daemon: dream resume complete", resumed);
    }
  } catch (err) {
    Logger.error("daemon: dream resume crashed", err);
  }
  const app = new Hono;
  mountOpsRoutes(app, runtime);
  mountCaptureRoute(app, runtime);
  mountEmbedRoute(app);
  mountDreamRoute(app, runDream);
  Bun.serve({
    port: config.daemon_port,
    hostname: "127.0.0.1",
    fetch: app.fetch,
    idleTimeout: 0
  });
  Logger.info("daemon listening", {
    url: `http://127.0.0.1:${config.daemon_port}`
  });
  let isTicking = false;
  const tick2 = async () => {
    if (isTicking)
      return;
    isTicking = true;
    try {
      await runtime.runWorkerTick();
    } catch (err) {
      Logger.error("worker tick crashed", err);
    } finally {
      isTicking = false;
    }
  };
  setInterval(tick2, WORKER_TICK_MS);
  tick2();
  const postHeartbeat = async () => {
    const [captured, observations, embedded, failed] = await Promise.all([
      outbox.list("captured"),
      outbox.list("observations"),
      outbox.list("embedded"),
      outbox.list("failed")
    ]);
    const response = await fetch(`${config.server_url}/api/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`
      },
      body: JSON.stringify({
        outbox_pending: captured.length,
        outbox_extracted: observations.length,
        outbox_embedded: embedded.length,
        outbox_failed: failed.length,
        last_processed_at: lastProcessedAt?.toISOString() ?? null
      })
    });
    if (!response.ok) {
      throw new Error(`heartbeat ${response.status}`);
    }
  };
  register({
    name: "dream",
    scheduleMs: DREAM_SCHEDULE_MS,
    run: runDream
  });
  register({
    name: "heartbeat",
    scheduleMs: HEARTBEAT_SCHEDULE_MS,
    run: postHeartbeat
  });
  register({
    name: "embedder-reap",
    scheduleMs: EMBEDDER_REAP_SCHEDULE_MS,
    run: () => disposeIfIdle().then(() => {
      return;
    })
  });
  await startScheduler();
}
if (import.meta.main) {
  await startDaemon();
}
export {
  startDaemon,
  pickAgent,
  listAgents
};
