#!/usr/bin/env bun
// Hook dispatcher. Invoked by Claude Code for SessionStart, UserPromptSubmit,
// PostToolUse, Stop, PreCompact. Reads JSON payload from stdin, posts a
// capture (or fetches the surface for SessionStart) to the Mneme server.
// Fail-open: errors never block the harness.

import {
  type MnemeConfig,
  isBlacklistedPath,
  isProjectRegistered,
  loadConfig,
  registerProject,
  serverUrl,
} from "./config.ts";
import { drainOutbox, writeOutbox } from "./outbox.ts";
import { baseScope as buildScope, discoverRepos } from "./scope.ts";

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
  repos: string[],
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
        repos,
        session_id: payload.session_id ?? null,
      }),
      signal: AbortSignal.timeout(5000),
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

// Tool names whose calls are pure session meta (todo lists, skill loads, MCP
// resource discovery) and produce captures with no project value. We also
// skip anything that talks to Mneme itself or claude-mem to avoid recursive
// memories about the memory system.
const SKIP_TOOLS = new Set<string>([
  "TodoWrite",
  "Skill",
  "ExitPlanMode",
  "EnterPlanMode",
  "AskUserQuestion",
  "ListMcpResourcesTool",
  "ReadMcpResourceTool",
  "TaskCreate",
  "TaskUpdate",
  "TaskList",
  "TaskGet",
  "TaskOutput",
  "TaskStop",
  "ToolSearch",
  "Monitor",
  "ScheduleWakeup",
]);

function shouldSkipTool(toolName: unknown): boolean {
  if (typeof toolName !== "string") return false;
  if (SKIP_TOOLS.has(toolName)) return true;
  // Recursive: own MCP tools + claude-mem MCP tools.
  if (/mneme/i.test(toolName) || /claude[-_]?mem/i.test(toolName)) return true;
  return false;
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

  // Hard blacklist: claude-internal dirs, /tmp, system mounts. Captures from
  // these paths are ghost-agent activity (claude-mem observer subagents,
  // transient subprocess workdirs from other plugins).
  if (sessionCwd && isBlacklistedPath(sessionCwd)) return;

  // SessionStart is the trust anchor: if cwd looks like a real project (passed
  // the blacklist above), auto-register it so subsequent events flow through.
  // For all other events, require the cwd to be in a registered project root.
  if (event === "SessionStart") {
    if (sessionCwd) {
      try {
        if (registerProject(sessionCwd)) {
          process.stderr.write(
            `mneme-hook[SessionStart]: registered new project ${sessionCwd}\n`,
          );
        }
      } catch (e) {
        process.stderr.write(
          `mneme-hook[SessionStart]: project register failed: ${
            e instanceof Error ? e.message : e
          }\n`,
        );
      }
    }
  } else if (sessionCwd && !isProjectRegistered(cfg, sessionCwd)) {
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
      // Walk cwd for sub-repos (Pinnacle-style multi-repo workspaces, git
      // worktrees). Falls back to whatever canonicalRepo resolved at the top.
      const discovered = sessionCwd ? discoverRepos(sessionCwd) : [];
      const repos = discovered.length > 0 ? discovered : repo ? [repo] : [];
      const surface = await fetchSurface(cfg, payload, repos);
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

      if (shouldSkipTool(toolName)) return;

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
