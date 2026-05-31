// @ts-nocheck — compiled by Pi's toolchain (which supplies @earendil-works/*
// and typebox), not by this repo's tsc. Kept outside tsconfig include globs
// for the same reason as register.ts.
//
// Pi-side capture (write path) — the analog of the Claude Code plugin's
// capture hooks (src/claude/hook.ts). Maps Pi's extension events to Mneme
// capture bodies and drops them into the harness-agnostic daemon outbox via
// the shared core in ../core/capture.ts. Recall (read path) lives in
// register.ts; this file is write-only. Declared alongside it under
// `pi.extensions` in the repo-root package.json so `pi install` auto-wires it.
//
// Event mapping (Pi event → Mneme capture source):
//   input (source=interactive)   → pi_prompt     (analog: UserPromptSubmit)
//   message_end (role=assistant)  → pi_assistant  (analog: claude_assistant)
//   tool_result                   → pi_tool       (analog: PostToolUse)
//   session_start                 → best-effort project registration
//
// Fail-open throughout: a capture failure must never break the agent loop.

import { isBlacklistedPath, loadConfig, registerProject } from "../core/config.ts";
import {
  buildToolObservation,
  isAdminSlashBashCommand,
  MAX_CAPTURE_BYTES,
  shouldSkipTool,
  truncate,
  writeCapture,
} from "../core/capture.ts";
import { pingDaemonFlush } from "../core/daemon-client.ts";
import { baseScope, repoForFile } from "../core/scope.ts";

// Skip short assistant replies ("ok", "got it") — not memorable. Mirrors the
// Claude Code hook's transcript filter.
const MIN_ASSISTANT_LEN = 200;

export default function mnemeCapture(pi) {
  let cfg;

  try {
    cfg = loadConfig();
  } catch {
    // Not configured on this machine — register no handlers, capture nothing.
    return;
  }

  // Per-event scope: repo/machine resolved from the live cwd, tagged for the
  // Pi harness (baseScope hardcodes claude-code), with the model id as agent
  // and Pi's session id for multi-turn extract coherence.
  const scopeFor = (ctx) => ({
    ...baseScope(cfg, ctx?.cwd),
    harness: "pi",
    agent: ctx?.model?.id ?? null,
    session_id: ctx?.sessionManager?.getSessionId?.() ?? null,
  });

  const blocked = (ctx) => !ctx?.cwd || isBlacklistedPath(ctx.cwd);

  pi.on("session_start", (_event, ctx) => {
    if (blocked(ctx)) return;

    try {
      registerProject(ctx.cwd);
    } catch {
      // best-effort; capture still works without it.
    }
  });

  pi.on("input", (event, ctx) => {
    if (event?.source !== "interactive") return;
    const text = typeof event.text === "string" ? event.text.trim() : "";

    if (!text || blocked(ctx)) return;
    writeCapture(cfg, { source: "pi_prompt", ...scopeFor(ctx), content: text });
  });

  pi.on("message_end", (event, ctx) => {
    if (blocked(ctx)) return;
    const msg = event?.message;

    if (!msg || msg.role !== "assistant" || !Array.isArray(msg.content)) return;
    const text = msg.content
      .filter((b) => b && b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n\n")
      .trim();

    if (text.length < MIN_ASSISTANT_LEN) return;
    writeCapture(cfg, {
      source: "pi_assistant",
      ...scopeFor(ctx),
      content: truncate(text, MAX_CAPTURE_BYTES),
      raw_meta: { event: "message_end" },
    });
  });

  pi.on("tool_result", (event, ctx) => {
    if (blocked(ctx) || shouldSkipTool(event?.toolName)) return;
    // Belt: never capture a Bash line invoking our own admin slash subcommands
    // (carries the admin password on argv). Shared with the Claude hook.
    if (isAdminSlashBashCommand(event?.toolName, event?.input)) return;

    const observation = buildToolObservation(
      event.toolName,
      event.input,
      event.content,
      event.isError,
    );

    if (!observation) return; // oversize even after scrubbing — drop.

    // Per-sub-repo tagging: when the tool touched a file, walk up to its
    // containing git repo and tag with that repo's canonical URL. Without
    // this, a multi-repo workspace tags everything with the workspace cwd and
    // loses provenance (mirrors the Claude hook's repoForFile path).
    const filePath =
      event?.input && typeof (event.input as Record<string, unknown>).file_path === "string"
        ? ((event.input as Record<string, unknown>).file_path as string)
        : null;
    const fileRepo = filePath ? repoForFile(filePath) : null;
    const scope = scopeFor(ctx);

    writeCapture(cfg, {
      source: "pi_tool",
      ...scope,
      ...(fileRepo ? { repo: fileRepo } : {}),
      content: observation,
      raw_meta: { event: "tool_result", tool: event.toolName },
    });
  });

  // Session boundaries: drain the outbox immediately instead of waiting for the
  // daemon's idle tick — the Pi analog of the Claude hook's PreCompact/
  // SessionEnd flush. Fire-and-forget; fail-open.
  const flush = () => {
    void pingDaemonFlush(cfg);
  };

  pi.on("session_compact", flush);
  pi.on("session_shutdown", flush);
}
