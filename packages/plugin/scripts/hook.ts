#!/usr/bin/env bun
// Hook dispatcher. Invoked by Claude Code for SessionStart, UserPromptSubmit,
// PostToolUse, Stop, PreCompact. Reads JSON payload from stdin, posts a
// capture (or fetches the surface for SessionStart) to the Mneme server.
// Fail-open: errors never block the harness.

import { type MnemeConfig, loadConfig, serverUrl } from "./config.ts";
import { drainOutbox, writeOutbox } from "./outbox.ts";
import { baseScope as buildScope } from "./scope.ts";

const event = process.argv[2] ?? "unknown";

async function readStdin(): Promise<Record<string, unknown>> {
  let buf = "";
  for await (const chunk of process.stdin as AsyncIterable<Buffer | string>) {
    buf += typeof chunk === "string" ? chunk : chunk.toString("utf8");
  }
  if (!buf.trim()) return {};
  try {
    return JSON.parse(buf) as Record<string, unknown>;
  } catch {
    return { raw: buf };
  }
}

async function postCapture(
  cfg: MnemeConfig,
  body: Record<string, unknown>,
): Promise<boolean> {
  try {
    const resp = await fetch(serverUrl(cfg, "/api/capture"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.auth.key}`,
        "X-Mneme-Source": "hook",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2500),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function fetchSurface(
  cfg: MnemeConfig,
  payload: Record<string, unknown>,
  repo: string | null,
): Promise<string> {
  try {
    const resp = await fetch(serverUrl(cfg, "/api/session/start"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.auth.key}`,
        "X-Mneme-Source": "hook",
      },
      body: JSON.stringify({
        machine_id: cfg.machine.id,
        repo,
        session_id: payload.session_id ?? null,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return "";
    const data = (await resp.json()) as { rendered?: string };
    return data.rendered ?? "";
  } catch {
    return "";
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…[truncated ${s.length - max}b]` : s;
}

function memoryWritePath(toolName: unknown, input: unknown): string | null {
  if (toolName !== "Write" && toolName !== "Edit") return null;
  if (!input || typeof input !== "object") return null;
  const fp = (input as Record<string, unknown>).file_path;
  if (typeof fp !== "string") return null;
  if (!/\.claude\/projects\/.*\/memory\/.*\.md$/.test(fp)) return null;
  return fp;
}

async function main(): Promise<void> {
  let cfg: MnemeConfig;
  try {
    cfg = loadConfig();
  } catch (e) {
    process.stderr.write(
      `mneme-hook[${event}]: config error: ${e instanceof Error ? e.message : e}\n`,
    );
    return; // never block harness
  }

  const payload = await readStdin();
  // Claude Code includes the session's working dir as `cwd`. Use it so
  // repo detection reflects the project the user is working in, not
  // wherever Claude Code spawned the hook script.
  const sessionCwd = typeof payload.cwd === "string" ? payload.cwd : undefined;

  // Skip captures from Claude-internal directories (claude-mem's observer
  // subagent runs in ~/.claude/observer-sessions/* and fires its own tool
  // calls — that's noise, not the user's project work).
  if (sessionCwd && /\/\.claude(\/|$)/.test(sessionCwd)) {
    return;
  }

  const sessionId =
    typeof payload.session_id === "string" ? payload.session_id : null;

  const baseScope = {
    source: "claude_hook",
    ...buildScope(cfg, sessionCwd),
    session_id: sessionId,
  };
  const repo = baseScope.repo;

  switch (event) {
    case "SessionStart": {
      const drain = await drainOutbox((b) => postCapture(cfg, b as Record<string, unknown>));
      if (drain.sent > 0 || drain.failed > 0) {
        process.stderr.write(
          `mneme-hook[SessionStart]: outbox flushed (${drain.sent} sent, ${drain.failed} still queued)\n`,
        );
      }
      const surface = await fetchSurface(cfg, payload, repo);
      if (surface) process.stdout.write(surface);
      return;
    }

    case "UserPromptSubmit": {
      const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
      if (!prompt.trim()) return;
      const body = { ...baseScope, content: prompt };
      const ok = await postCapture(cfg, body);
      if (!ok) writeOutbox(body, "user_prompt");
      return;
    }

    case "Stop":
    case "PreCompact": {
      const body = {
        ...baseScope,
        source: "claude_summary",
        content: truncate(JSON.stringify(payload), 64 * 1024),
        raw_meta: { event },
      };
      const ok = await postCapture(cfg, body);
      if (!ok) writeOutbox(body, "summary");
      return;
    }

    case "PostToolUse": {
      const toolName = payload.tool_name;
      const toolInput = payload.tool_input;
      const toolResp = payload.tool_response;

      const memPath = memoryWritePath(toolName, toolInput);
      if (memPath) {
        const ti = toolInput as Record<string, unknown>;
        const content =
          typeof ti.content === "string"
            ? ti.content
            : typeof ti.new_string === "string"
              ? ti.new_string
              : "";
        if (!content.trim()) return;
        const body = {
          ...baseScope,
          source: "claude_memory",
          content,
          raw_meta: { tool: toolName, file_path: memPath },
        };
        const ok = await postCapture(cfg, body);
        if (!ok) writeOutbox(body, "claude_memory");
        return;
      }

      const observation = JSON.stringify({
        tool: toolName,
        input: toolInput,
        result: toolResp,
      });
      if (observation.length > 64 * 1024) return;
      const body = {
        ...baseScope,
        content: observation,
        raw_meta: { event, tool: toolName },
      };
      const ok = await postCapture(cfg, body);
      if (!ok) writeOutbox(body, "post_tool");
      return;
    }

    default:
      return;
  }
}

main().catch((err) => {
  process.stderr.write(
    `mneme-hook[${event}]: ${err instanceof Error ? err.message : err}\n`,
  );
  process.exit(0);
});
