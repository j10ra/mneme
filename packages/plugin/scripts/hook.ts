#!/usr/bin/env bun
// Hook dispatcher. Invoked by Claude Code for SessionStart, UserPromptSubmit,
// PostToolUse, Stop, PreCompact. Reads JSON payload from stdin, posts a
// capture (or fetches the surface for SessionStart) to the Mneme server.
// Fail-open: errors never block the harness.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type MnemeConfig,
  isBlacklistedPath,
  isProjectRegistered,
  loadConfig,
  registerProject,
  serverUrl,
} from "./config.ts";
import { isDaemonConfigStale } from "./daemon-install.ts";
import { baseScope as buildScope, discoverRepos, repoForFile } from "./scope.ts";
import { scrubData } from "./scrub.ts";

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

// Self-heal the launchd plist (or systemd unit / scheduled task) when
// /plugin update lands a new version. The plist hardcodes the cache
// dir of whatever plugin version was active at install time. After
// `/plugin update mneme`, the new code lands in a NEW cache dir, but
// the plist still points at the old one — so the launchd-managed
// daemon keeps running stale code until something rewrites it.
//
// On every SessionStart, derive the current plugin root from this
// script's own location (works because every CC instance loads hooks
// from the active plugin cache version). If the platform's service
// config (launchd plist on darwin / systemd unit on linux+WSL / Task
// Scheduler XML on win32) points at a stale daemon.js, spawn a
// detached refresh that re-runs the install scaffolding. Detached so
// SessionStart doesn't pay the 5-30s cost of `bun install --production`
// on plugin update day.
//
// Until 1.0.65 this short-circuited on `platform() !== "darwin"`, so
// linux/WSL/win32 never auto-refreshed and users had to manually kill
// the running daemon to migrate to a new plugin version. The cross-
// platform staleness predicate now lives in daemon-install.ts as
// `isDaemonConfigStale`.
function refreshDaemonIfStale(): void {
  const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  if (!isDaemonConfigStale(pluginRoot)) return;
  // Stale config. Spawn detached refresh; don't block SessionStart.
  process.stderr.write(
    `mneme: service config points at stale plugin cache, refreshing daemon to ${pluginRoot}\n`,
  );
  try {
    const refreshScript = join(pluginRoot, "scripts/refresh-daemon.ts");
    if (!existsSync(refreshScript)) return;
    const child = spawn(process.execPath, [refreshScript], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // best-effort; if spawn fails the operator can still run /mneme:setup
  }
}

// Fire-and-forget ping to the local daemon's /flush endpoint. Used at
// natural session boundaries (Stop, PreCompact, SessionEnd) to skip
// the daemon's idle window and process pending captures immediately.
// Returns void: a flush failure (daemon down, server error) doesn't
// matter because the daemon's idle gate is the safety net.
async function pingDaemonFlush(cfg: MnemeConfig): Promise<void> {
  if (!cfg.daemon) return;
  try {
    await fetch(`http://127.0.0.1:${cfg.daemon.port}/flush`, {
      method: "POST",
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Daemon unreachable; idle gate will eventually fire.
  }
}

// Sync SHA via node:crypto. Bun's WebCrypto can fail to resolve the
// awaited Promise when the hook is spawned with payload piped to stdin
// (CC's standard hook invocation): stdin EOF drains the loop before
// the digest microtask fires. node:crypto.createHash is synchronous
// and sidesteps the issue entirely.
function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// Write directly into the daemon's captured/ queue. Used when the daemon
// HTTP listener is briefly unreachable (restart gap, crash). The daemon
// picks up files on its very next tick.
//
// Hook is intentionally dumb: no dedup, no ledger checks. The daemon's
// runDedup() worker drops byte-and-uuid duplicates at the captured/
// boundary, mirroring the server's intake constraint.
//
// Id format matches handleCapture: `<ms-timestamp>-<8-char-sha-prefix>`.
async function writeToDaemonOutbox(
  cleaned: Record<string, unknown>,
): Promise<boolean> {
  try {
    const content =
      typeof cleaned.content === "string" ? cleaned.content : "";
    const hash = sha256Hex(content);
    const id = `${Date.now()}-${hash.slice(0, 8)}`;
    const dir = join(homedir(), ".mneme", "outbox", "capture", "captured");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    const tmp = join(dir, `.${id}.json.tmp`);
    const final = join(dir, `${id}.json`);
    writeFileSync(tmp, JSON.stringify(cleaned));
    renameSync(tmp, final);
    return true;
  } catch {
    return false;
  }
}

async function postCapture(
  cfg: MnemeConfig,
  body: Record<string, unknown>,
): Promise<boolean> {
  // Scrub here so every event funnels through one redaction point.
  const cleaned = scrubData(body) as Record<string, unknown>;

  // Hook is a dumb writer. Dedup happens daemon-side at the captured/
  // boundary (runDedup()) so all dedup logic lives in one place and
  // both the HTTP path and filesystem-fallback path go through the
  // same checks. Server-side (content_sha256, machine_id) is the final
  // backstop — DB never sees dupes regardless.
  if (!cfg.daemon) {
    // No daemon configured = no place to put captures. Drop and let the
    // operator re-run /mneme:setup. Returning true so the harness
    // doesn't surface this as an error per call.
    return true;
  }

  try {
    const resp = await fetch(`http://127.0.0.1:${cfg.daemon.port}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Mneme-Source": "hook",
      },
      body: JSON.stringify(cleaned),
      signal: AbortSignal.timeout(2500),
    });
    if (resp.ok) return true;
  } catch {
    // Daemon unreachable; fall through to direct outbox write.
  }
  return await writeToDaemonOutbox(cleaned);
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

/** Extract concatenated text blocks from a Claude Code transcript JSONL
 *  assistant entry. Returns null if the entry has no text content (e.g.,
 *  pure tool_use turn — already captured separately via PostToolUse). */
function assistantTextFromEntry(entry: Record<string, unknown>): string | null {
  if (entry.type !== "assistant") return null;
  const message = entry.message as Record<string, unknown> | undefined;
  if (!message) return null;
  const content = message.content;
  if (!Array.isArray(content)) {
    return typeof message.content === "string" ? (message.content as string) : null;
  }
  const texts: string[] = [];
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      (block as Record<string, unknown>).type === "text" &&
      typeof (block as Record<string, unknown>).text === "string"
    ) {
      texts.push((block as Record<string, unknown>).text as string);
    }
  }
  const joined = texts.join("\n\n").trim();
  return joined.length > 0 ? joined : null;
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
      // Self-heal launchd target after /plugin update. Detached spawn,
      // doesn't block surface fetch.
      refreshDaemonIfStale();
      // Outbox draining used to live here for the legacy plugin/ fallback
      // queue. Now the hook writes directly into outbox/capture/pending/
      // when the daemon is briefly unreachable, and the daemon's worker
      // tick + fs.watch drains it without any plugin-side help.
      // Walk cwd for sub-repos (Pinnacle-style multi-repo workspaces, git
      // worktrees). Falls back to whatever canonicalRepo resolved at the top.
      const discovered = sessionCwd ? discoverRepos(sessionCwd) : [];
      const repos = discovered.length > 0 ? discovered : repo ? [repo] : [];
      const surface = await fetchSurface(cfg, payload, repos);
      if (surface) {
        // Claude Code injects SessionStart context only when the hook returns
        // a JSON envelope with hookSpecificOutput.additionalContext. Raw
        // markdown on stdout is silently dropped.
        process.stdout.write(
          JSON.stringify({
            hookSpecificOutput: {
              hookEventName: "SessionStart",
              additionalContext: surface,
            },
          }),
        );
      }
      return;
    }

    case "UserPromptSubmit": {
      const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
      if (!prompt.trim()) return;
      const body = { ...baseScope, content: prompt };
      const ok = await postCapture(cfg, body);
      return;
    }

    case "Stop":
    case "PreCompact":
    case "SessionEnd": {
      // Per-turn Stop events let captures keep building so the daemon
      // can extract a coherent multi-turn batch later. PreCompact and
      // SessionEnd are real session boundaries — they still ping
      // /flush below to drain pending captures immediately. The
      // boundary distinction is made there, not here, since the
      // capture-write path is identical for all three.
      const isSessionBoundary = event === "PreCompact" || event === "SessionEnd";
      // 1) Audit/metadata capture (session_id, transcript_path, cwd, etc).
      //    Small payload — Claude Code doesn't include conversation text here.
      const body = {
        ...baseScope,
        source: "claude_summary",
        content: truncate(JSON.stringify(payload), 64 * 1024),
        raw_meta: { event },
      };
      const ok = await postCapture(cfg, body);

      // 2) Conversation text — read the JSONL transcript and capture assistant
      //    messages individually. Without this the assistant's reasoning,
      //    proposals, and decisions are lost (only user prompts and tool calls
      //    are otherwise captured). Server-side content_sha256 dedup handles
      //    re-runs when Stop/PreCompact fires multiple times in one session.
      const transcriptPath =
        typeof payload.transcript_path === "string"
          ? payload.transcript_path
          : null;
      if (transcriptPath) {
        try {
          const { readFileSync } = await import("node:fs");
          const raw = readFileSync(transcriptPath, "utf8");
          const lines = raw.split("\n").filter((l) => l.trim().length > 0);
          let captured = 0;
          for (const line of lines) {
            let entry: Record<string, unknown>;
            try {
              entry = JSON.parse(line) as Record<string, unknown>;
            } catch {
              continue;
            }
            const text = assistantTextFromEntry(entry);
            // Filter very short replies ("ok", "got it") — not memorable.
            if (!text || text.length < 200) continue;
            const messageUuid =
              typeof entry.uuid === "string" ? entry.uuid : undefined;
            const turnBody = {
              ...baseScope,
              source: "claude_assistant",
              content: truncate(text, 64 * 1024),
              raw_meta: { event, message_uuid: messageUuid },
            };
            const turnOk = await postCapture(cfg, turnBody);
            if (turnOk) captured++;
          }
          if (captured > 0) {
            process.stderr.write(
              `mneme-hook[${event}]: captured ${captured} assistant turn(s) from transcript\n`,
            );
          }
        } catch (e) {
          process.stderr.write(
            `mneme-hook[${event}]: transcript read failed: ${
              e instanceof Error ? e.message : e
            }\n`,
          );
        }
      }
      // Only PreCompact/SessionEnd flush. Stop is per-turn — letting
      // captures buffer across turns means the next extract sees
      // multi-turn context, which produces better observations than
      // per-turn fragments.
      if (isSessionBoundary) {
        await pingDaemonFlush(cfg);
      }
      // Don't clear the dedup set on SessionEnd. Resuming a session
      // (`claude --resume <id>`) reuses the same session_id and fires
      // Stop again, which replays the FULL transcript from disk. With
      // the dedup file gone, every transcript entry looks "new" and we
      // refire ~hundreds of redundant captures — the exact "explodes
      // on resume" symptom we set out to fix. Keep the file. It's
      // ~65 bytes per unique capture, self-caps at session length, and
      // the orphans (sessions never resumed) are tiny noise on disk.
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
        return;
      }

      // Per-sub-repo tagging: when the tool call touches a file (Read,
      // Edit, Write, NotebookEdit), walk up to its containing git repo
      // and tag the capture with that repo's canonical URL. Without
      // this, captures from a multi-repo workspace ("Pinnacle"-style)
      // tag with the workspace basename (`dir:Pinnacle`) instead of
      // the actual sub-repo, losing provenance.
      const ti = toolInput as Record<string, unknown> | undefined;
      const filePath =
        typeof ti?.file_path === "string" ? ti.file_path : null;
      const fileRepo = filePath ? repoForFile(filePath) : null;
      const scope = fileRepo ? { ...baseScope, repo: fileRepo } : baseScope;

      const observation = JSON.stringify({
        tool: toolName,
        input: toolInput,
        result: toolResp,
      });
      if (observation.length > 64 * 1024) return;
      const body = {
        ...scope,
        content: observation,
        raw_meta: { event, tool: toolName },
      };
      const ok = await postCapture(cfg, body);
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
