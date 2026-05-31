#!/usr/bin/env bun
// Hook dispatcher. Invoked by Claude Code for SessionStart, UserPromptSubmit,
// PostToolUse, Stop, PreCompact. Reads JSON payload from stdin, posts a
// capture (or fetches the surface for SessionStart) to the Mneme server.
// Fail-open: errors never block the harness.

import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type MnemeConfig,
  isBlacklistedPath,
  isProjectRegistered,
  loadConfig,
  registerProject,
} from "../core/config.ts";
import { isDaemonConfigStale } from "../daemon/daemon-install.ts";
import {
  buildToolObservation,
  isAdminSlashBashCommand,
  isRecursiveTool,
  scrubAndRedact,
  writeToOutbox,
} from "../core/capture.ts";
import { baseScope as buildScope, discoverRepos, repoForFile } from "../core/scope.ts";
import { fetchSurface, renderSurfaceForLLM, summariseSurfaceForUser } from "../core/surface.ts";
import { pingDaemonFlush } from "../core/daemon-client.ts";
import { formatCurrentTime } from "../core/time.ts";
import { plog } from "../core/log.ts";

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
// script's own location. If the platform's service config (launchd /
// systemd / Task Scheduler) points at a stale daemon.js, spawn a
// detached refresh that re-runs the install scaffolding. Detached so
// SessionStart doesn't pay the 5-30s cost of `bun install --production`
// on plugin update day. Cross-platform staleness predicate lives in
// daemon-install.ts as `isDaemonConfigStale`.
// Highest semver-shaped directory under the plugin cache. Returns null
// if the cache root doesn't exist or has no valid version dirs. This is
// what the daemon SHOULD be pinned to — not the version that happens to
// be loaded by this hook, which may lag the cache after /plugin update.
function latestCachedPluginRoot(): string | null {
  // This file lives at <version>/src/claude/hook.ts — three dirname() hops up
  // to the plugin version root (…/cache/j10ra-mneme/mneme/<version>/).
  const ownRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  // Walk up to the cache root: …/cache/j10ra-mneme/mneme/<version>/
  const cacheRoot = dirname(ownRoot);

  if (!existsSync(cacheRoot)) return ownRoot;
  let best: { ver: string; tuple: [number, number, number] } | null = null;

  for (const entry of readdirSync(cacheRoot)) {
    const m = entry.match(/^(\d+)\.(\d+)\.(\d+)$/);

    if (!m) continue;
    const tuple: [number, number, number] = [Number(m[1]), Number(m[2]), Number(m[3])];

    if (!best || tuple > best.tuple) best = { ver: entry, tuple };
  }

  if (!best) return ownRoot;

  return join(cacheRoot, best.ver);
}

function refreshDaemonIfStale(): void {
  // Target the LATEST cached version, not the hook's own version.
  // After /plugin update lands a new cache dir, the hook may still be
  // loaded from the prior version until /reload-plugins fires; that's
  // fine — the daemon refresh path is independent of the hook's own
  // location, so we can still update the plist + daemon.
  const targetRoot =
    latestCachedPluginRoot() ?? dirname(dirname(dirname(fileURLToPath(import.meta.url))));

  if (!isDaemonConfigStale(targetRoot)) return;

  const ownRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const ownVersion = basename(ownRoot);
  const targetVersion = basename(targetRoot);

  process.stderr.write(
    `mneme: service config stale, refreshing daemon to ${targetVersion} (hook is on ${ownVersion})\n`,
  );

  if (ownVersion !== targetVersion) {
    process.stderr.write(
      `mneme: this session is on plugin ${ownVersion}; run /reload-plugins to load ${targetVersion}\n`,
    );
  }

  try {
    // Run refresh-daemon from the TARGET version so the new daemon is
    // what gets installed into the plist.
    const refreshScript = join(targetRoot, "src/daemon/refresh-daemon.ts");

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

async function postCapture(cfg: MnemeConfig, body: Record<string, unknown>): Promise<boolean> {
  // One redaction point for every event: shared scrub + machine-local
  // literal-secret redaction (admin password, per-machine token) — the
  // same path the Pi harness uses. See core/capture.ts.
  const cleaned = scrubAndRedact(cfg, body);

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

  // Fallback when the daemon HTTP listener is briefly unreachable (restart
  // gap, crash): write straight into captured/, drained on the next tick.
  return writeToOutbox(cleaned);
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

  // Recursive guard (own MCP tools + claude-mem) is shared across harnesses.
  return isRecursiveTool(toolName);
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

  // One INFO line per hook firing so the dashboard log panel shows
  // every event end-to-end (SessionStart, UserPromptSubmit, PostToolUse,
  // Stop, PreCompact, SessionEnd). Fields kept short — tool/source/cwd
  // basename — to stay grep-friendly in the live tail.
  plog("INFO", `hook.${event.toLowerCase()}`, "fired", {
    source: typeof payload.source === "string" ? payload.source : undefined,
    tool: typeof payload.tool_name === "string" ? payload.tool_name : undefined,
    cwd: sessionCwd && typeof sessionCwd === "string" ? sessionCwd.split("/").pop() : undefined,
  });

  // Hard blacklist: claude-internal dirs, /tmp, system mounts. Captures from
  // these paths are ghost-agent activity (claude-mem observer subagents,
  // transient subprocess workdirs from other plugins).
  if (sessionCwd && isBlacklistedPath(sessionCwd)) {
    plog("INFO", `hook.${event.toLowerCase()}`, "skipped: blacklisted cwd", {
      cwd: sessionCwd,
    });

    return;
  }

  // SessionStart is the trust anchor: if cwd looks like a real project (passed
  // the blacklist above), auto-register it so subsequent events flow through.
  // For all other events, require the cwd to be in a registered project root.
  if (event === "SessionStart") {
    if (sessionCwd) {
      try {
        if (registerProject(sessionCwd)) {
          process.stderr.write(`mneme-hook[SessionStart]: registered new project ${sessionCwd}\n`);
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

  const sessionId = typeof payload.session_id === "string" ? payload.session_id : null;

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
      // Hook writes directly into outbox/capture/captured/ when the
      // daemon's HTTP listener is briefly unreachable; the daemon's
      // worker tick + fs.watch drains it without any plugin-side help.
      // Walk cwd for sub-repos (Pinnacle-style multi-repo workspaces, git
      // worktrees). Falls back to whatever canonicalRepo resolved at the top.
      const discovered = sessionCwd ? discoverRepos(sessionCwd) : [];
      const repos = discovered.length > 0 ? discovered : repo ? [repo] : [];

      const source = typeof payload.source === "string" ? payload.source : "startup";
      const surface = await fetchSurface(cfg, {
        repos,
        sessionId: typeof payload.session_id === "string" ? payload.session_id : null,
        source: "hook",
      });

      if (surface) {
        // Two channels, two purposes — not duplicated content:
        //   additionalContext → LLM gets the full surface plus a one-line
        //                       reminder of total corpus size and how to
        //                       unfold rows that aren't in this slice.
        //   systemMessage     → user gets a compact status banner: repo,
        //                       machines, since-last-session totals, plus
        //                       a flavor line. No raw memory rows here.
        // Banner on startup + clear: both are moments the user is looking
        // at a fresh context and wants confirmation the surface re-injected.
        // resume/compact stay quiet (they're mid-flow, not fresh starts).
        const fullForLlm = renderSurfaceForLLM(surface);
        const injectedBytes = Buffer.byteLength(fullForLlm, "utf8");
        const summaryForUser = summariseSurfaceForUser(surface, injectedBytes);
        const envelope: Record<string, unknown> = {
          hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: fullForLlm,
          },
        };

        if (source === "startup" || source === "clear") {
          envelope.systemMessage = summaryForUser;
        }

        // Stale-session banner: the hook running RIGHT NOW lives at
        // `.../mneme/<ownVer>/src/claude/hook.ts`. If the cache has a
        // higher version, the live Claude Code session is loading the
        // old hooks + slash commands until the user `/exit`s and
        // restarts. Daemon self-update (1.1.80+) takes care of the
        // long-running process; this banner just nudges the user.
        const ownRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
        const targetRoot = latestCachedPluginRoot();

        if (targetRoot && targetRoot !== ownRoot) {
          const ownV = basename(ownRoot);
          const targetV = basename(targetRoot);
          const note = `mneme: this session is on plugin ${ownV}; cache has ${targetV}. Exit + restart Claude Code to pick up the new slash commands + hooks.`;

          envelope.systemMessage = envelope.systemMessage
            ? `${envelope.systemMessage}\n${note}`
            : note;
        }

        process.stdout.write(JSON.stringify(envelope));
      }

      return;
    }

    case "UserPromptSubmit": {
      const prompt = typeof payload.prompt === "string" ? payload.prompt : "";

      // Inject current wall-clock time on every prompt. Long sessions and
      // resumed transcripts otherwise leave the agent reasoning against a
      // stale session-start date; this is the only place "now" is reliably
      // grounded turn-by-turn.
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: `Current time: ${formatCurrentTime()}`,
          },
        }),
      );

      if (prompt.trim()) {
        const body = { ...baseScope, content: prompt };

        await postCapture(cfg, body);
      }

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
        typeof payload.transcript_path === "string" ? payload.transcript_path : null;

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
            const messageUuid = typeof entry.uuid === "string" ? entry.uuid : undefined;
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
            `mneme-hook[${event}]: transcript read failed: ${e instanceof Error ? e.message : e}\n`,
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

      // Skip bash invocations of our own admin slash subcommands — their
      // command lines carry the admin password verbatim. Shared predicate
      // (see core/capture.ts) so every harness applies the same belt.
      if (isAdminSlashBashCommand(toolName, toolInput)) return;

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
      const filePath = typeof ti?.file_path === "string" ? ti.file_path : null;
      const fileRepo = filePath ? repoForFile(filePath) : null;
      const scope = fileRepo ? { ...baseScope, repo: fileRepo } : baseScope;

      // buildToolObservation scrubs the structured input/result (stubbing
      // inline base64) BEFORE measuring the size cap, so a screenshot can't
      // sail under the cap un-stubbed and later choke the batch extract API.
      // Returns null when the scrubbed observation is still oversize.
      const observation = buildToolObservation(toolName as string, toolInput, toolResp);

      if (!observation) return;
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
  process.stderr.write(`mneme-hook[${event}]: ${err instanceof Error ? err.message : err}\n`);
  process.exit(0);
});
