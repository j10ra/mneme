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
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
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
import { decryptAdminPassword } from "./admin-secret.ts";
import { plog } from "./log.ts";

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
  const ownRoot = dirname(dirname(fileURLToPath(import.meta.url)));
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
  const targetRoot = latestCachedPluginRoot() ?? dirname(dirname(fileURLToPath(import.meta.url)));
  if (!isDaemonConfigStale(targetRoot)) return;

  const ownRoot = dirname(dirname(fileURLToPath(import.meta.url)));
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
    const refreshScript = join(targetRoot, "scripts/refresh-daemon.ts");
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
async function writeToDaemonOutbox(cleaned: Record<string, unknown>): Promise<boolean> {
  try {
    const content = typeof cleaned.content === "string" ? cleaned.content : "";
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

/** Build a per-machine literal redactor: any time one of THIS machine's
 *  secrets (per-machine bearer + admin password, when stored) appears
 *  verbatim in capture content, strip it. Belt for the shared scrubber's
 *  pattern braces — admin passwords are arbitrary user-chosen strings
 *  with no fixed shape, so they'd otherwise sail past every regex.
 *
 *  Run AFTER scrubData so we operate on already-pattern-redacted text.
 *  Sort longest-first to handle prefix-collision cases safely. Skip
 *  secrets shorter than 8 chars to avoid pathological replaces against
 *  common substrings. */
function buildLocalRedactor(cfg: MnemeConfig): (s: string) => string {
  const secrets = new Set<string>();
  if (cfg.auth?.key) secrets.add(cfg.auth.key);
  const fromEnv = process.env.MNEME_ADMIN_PASSWORD;
  if (fromEnv) secrets.add(fromEnv);
  if (cfg.admin?.secret) {
    const pw = decryptAdminPassword(cfg.admin.secret);
    if (pw) secrets.add(pw);
  }
  const list = [...secrets].filter((s) => s.length >= 8).sort((a, b) => b.length - a.length);
  if (list.length === 0) return (s) => s;
  return (s) => {
    let out = s;
    for (const sec of list) {
      if (out.includes(sec)) {
        out = out.split(sec).join("[REDACTED:mneme_secret]");
      }
    }
    return out;
  };
}

function redactInPlace(obj: Record<string, unknown>, redact: (s: string) => string): void {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") {
      obj[k] = redact(v);
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      redactInPlace(v as Record<string, unknown>, redact);
    } else if (Array.isArray(v)) {
      obj[k] = v.map((item) =>
        typeof item === "string"
          ? redact(item)
          : item && typeof item === "object"
            ? (redactInPlace(item as Record<string, unknown>, redact), item)
            : item,
      );
    }
  }
}

async function postCapture(cfg: MnemeConfig, body: Record<string, unknown>): Promise<boolean> {
  // Scrub here so every event funnels through one redaction point.
  const cleaned = scrubData(body) as Record<string, unknown>;
  // Second pass: machine-specific literal secrets (admin password,
  // per-machine token). The shared scrubber catches well-shaped tokens;
  // this catches user-chosen passwords that have no fixed pattern.
  const redact = buildLocalRedactor(cfg);
  redactInPlace(cleaned, redact);

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

/** Plain-text the markdown surface for terminal rendering. Claude Code
 *  prints SessionStart hook output verbatim in the transcript — `##`,
 *  `**`, and `_..._` don't render, they show as literal characters.
 *  Strip them so the surface reads cleanly in a monospace shell. */
function formatSurfaceForTerminal(surface: string): string {
  return (
    surface
      .replace(/^#{1,6}\s+/gm, "") // `# Title` / `## Section` → `Title` / `Section`
      .replace(/^_(.+)_$/gm, "$1") // `_subtitle_` (whole-line italic) → `subtitle`
      .replace(/\*\*([^*]+)\*\*/g, "$1") // `**bold**` (inline) → `bold`
      // Section emoji anchors. "Recent sessions" must run before "Recent"
      // (date-range subsection) so the more specific match wins.
      .replace(/^Rules \(/gm, "📌 Rules (")
      .replace(/^Themes \(/gm, "🧩 Themes (")
      .replace(/^Recent sessions \(/gm, "💬 Recent sessions (")
      .replace(/^Recent \(last/gm, "⏱️  Recent (last")
  );
}

/** Parse the markdown surface header + per-section counts into a single
 *  struct that both the user-visible summary and the LLM-side reminder
 *  consume. Returns null if the surface format drifts. */
type SurfaceParse = {
  repo: string;
  machineCount: string;
  sinceAgo?: string;
  captures?: string;
  memories?: string;
  superseded?: string;
  sections: { name: string; total: string }[];
};

function parseSurface(surface: string): SurfaceParse | null {
  const header = surface.match(/^#\s+Mneme\s+·\s+(\S+)\s+·\s+across\s+(\d+)\s+machine/m);
  if (!header) return null;
  const stats = surface.match(
    /^_Since last session \(([^)]+)\s+ago\):\s+(\d+)\s+captures,\s+(\d+)\s+memories(?:\s+·\s+(\d+)\s+superseded[^_]*)?_/m,
  );
  const sectionPatterns: Array<[string, RegExp]> = [
    ["rules", /^##\s+Rules\s+\(\d+\s+of\s+(\d+)\)/m],
    ["themes", /^##\s+Themes\s+\(\d+\s+of\s+(\d+)\)/m],
    ["recent", /^##\s+Recent\s+\(last[^)]+\)\s+\(\d+\s+of\s+(\d+)\)/m],
    ["sessions", /^##\s+Recent\s+sessions\s+\(\d+\s+of\s+(\d+)\)/m],
  ];
  const sections = sectionPatterns
    .map(([name, pattern]) => {
      const m = surface.match(pattern);
      const total = m?.[1];
      return total ? { name, total } : null;
    })
    .filter((s): s is { name: string; total: string } => s !== null);

  const repo = header[1];
  const machineCount = header[2];
  if (!repo || !machineCount) return null;

  return {
    repo,
    machineCount,
    sinceAgo: stats?.[1],
    captures: stats?.[2],
    memories: stats?.[3],
    superseded: stats?.[4],
    sections,
  };
}

/** Pull the rendered rows of one section out of the full surface markdown
 *  for the user-visible banner. Strips UUID brackets — those are for the
 *  LLM to dereference via mneme_sql, the user just wants to see what's
 *  loaded. Returns up to `limit` lines, each starting with "- ". */
function extractSectionForUser(surface: string, section: string, limit: number): string[] {
  const re = new RegExp(`^##\\s+${section}\\b[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "m");
  const match = surface.match(re);
  if (!match?.[1]) return [];
  return match[1]
    .split("\n")
    .filter((l) => l.startsWith("- ["))
    .slice(0, limit)
    .map((l) => l.replace(/^-\s+\[[0-9a-f-]+\]\s*/, "- "));
}

/** UTF-8 byte size, rendered as B / KB / MB. The LLM-injected surface
 *  is a string, so byteLength of its UTF-8 encoding is the actual cost
 *  going into context. Kept terse — this lands in the user banner. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** User-visible status banner for the systemMessage channel. Header +
 *  corpus totals + top pinned rows (stripped of UUIDs) + a flavor
 *  line that also reports how many bytes the surface is injecting into
 *  the LLM context. The LLM gets the full surface separately via
 *  additionalContext — including the auto-derived Rules section, which
 *  stays LLM-only; the banner shows only deliberately pinned rows. */
function summariseSurfaceForUser(surface: string, injectedBytes: number): string {
  const p = parseSurface(surface);
  if (!p) return "Mneme memory loaded.";
  const lines: string[] = [`Mneme · ${p.repo} · ${p.machineCount} machines`];
  if (p.sinceAgo && p.memories && p.captures) {
    const supText = p.superseded ? ` · ${p.superseded} superseded` : "";
    lines.push(
      `Since last session (${p.sinceAgo} ago): ${p.memories} memories · ${p.captures} captures${supText}`,
    );
  }

  const pinned = extractSectionForUser(surface, "Pinned", 5);
  if (pinned.length > 0) {
    lines.push("");
    lines.push("📍 Pinned");
    lines.push(...pinned);
  }

  lines.push("");
  lines.push(
    `🧠 Memory loaded with decisions, bug fixes, discoveries, and prior sessions. Unfold any of it on demand. (~${formatBytes(injectedBytes)} context)`,
  );
  return lines.join("\n");
}

/** Kind glyph legend embedded into the LLM reminder so the agent can
 *  interpret row symbols on first read, without needing to load the
 *  using-mneme skill's references. Must stay in sync with KIND_GLYPH
 *  in packages/server/src/services/surface.ts. */
const KIND_LEGEND =
  "🔴 bugfix · 🟣 feature · ⚖️ decision · 🔵 discovery · 💬 preference · " +
  "🚧 constraint · 🚨 security_alert · 📎 reference · 🎯 summary · " +
  "🧩 cluster · 🧠 claude_memory · 📝 note";

/** LLM-side reminder prepended to the full surface. Tells the agent
 *  what's in the corpus, how to reach the rest, and what every glyph
 *  on the row means. Skipped if parsing failed or no sections matched. */
function prefixSurfaceForLLM(surface: string, strippedSurface: string): string {
  const p = parseSurface(surface);
  if (!p || p.sections.length === 0) return strippedSurface;
  const totals = p.sections.map((s) => `${s.total} ${s.name}`).join(" · ");
  const reminder =
    `Mneme corpus: ${totals}. The surface below is a relevance-ranked slice. ` +
    `Unfold any [id] or query mneme_sql to access the rest. The using-mneme ` +
    `skill has the full recall workflow (3-layer search → walk → unfold), ` +
    `live-state verification, and self-correcting recall — load it when ` +
    `working with memory beyond what the surface already gave you.\n\n` +
    `Glyph legend (the symbol after each [id]):\n${KIND_LEGEND}\n\n` +
    `Memory split: Mneme = cross-machine project knowledge (decisions, fixes, ` +
    "references, postmortems). Local auto-memory at `~/.claude/projects/.../memory/` " +
    `= per-machine behavioral preferences (tone, response style, harness quirks).\n\n` +
    `Writing memories: hooks auto-capture conversation + tool use, so most ` +
    `memories land without intervention. Beyond that, use agent discretion to ` +
    "invoke `/mneme:memory <text>` (crystallize a synthesised finding the auto- " +
    "capture would miss), `/mneme:supersede <old> <new>` (a newer fact replaces " +
    "an old one), and `/mneme:archive <uuid>` (the user contradicts a memory " +
    "this session). `/mneme:pin` is reserved for the user — never invoke it. " +
    `Act on clear signal; ask the user first only when which memory to ` +
    `supersede/archive is genuinely ambiguous.\n\n`;
  return reminder + strippedSurface;
}

/** Compact "now" stamp injected on every UserPromptSubmit so the agent
 *  always has fresh wall-clock context (debugging, long sessions, any
 *  "yesterday"/"earlier today" reasoning). Format: `2026-05-12 (Tue) 10:25 AM PST`. */
function formatCurrentTime(): string {
  const d = new Date();
  const isoDate = d.toISOString().slice(0, 10);
  const dayTime = d.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
  // dayTime renders as "Tue, 10:25 AM PST" — promote the comma to parens
  // around the weekday so the line reads cleaner alongside the ISO date.
  const [weekday, ...rest] = dayTime.split(", ");
  return `${isoDate} (${weekday}) ${rest.join(", ")}`;
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
      const surface = await fetchSurface(cfg, payload, repos);
      if (surface) {
        // Two channels, two purposes — not duplicated content:
        //   additionalContext → LLM gets the full surface plus a one-line
        //                       reminder of total corpus size and how to
        //                       unfold rows that aren't in this slice.
        //   systemMessage     → user gets a compact status banner: repo,
        //                       machines, since-last-session totals, plus
        //                       a flavor line. No raw memory rows here.
        // Gate systemMessage to source=startup only.
        const fullForLlm = prefixSurfaceForLLM(surface, formatSurfaceForTerminal(surface));
        const injectedBytes = Buffer.byteLength(fullForLlm, "utf8");
        const summaryForUser = summariseSurfaceForUser(surface, injectedBytes);
        const envelope: Record<string, unknown> = {
          hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: fullForLlm,
          },
        };
        if (source === "startup") {
          envelope.systemMessage = summaryForUser;
        }
        // Stale-session banner: the hook running RIGHT NOW lives at
        // `.../mneme/<ownVer>/scripts/hook.ts`. If the cache has a
        // higher version, the live Claude Code session is loading the
        // old hooks + slash commands until the user `/exit`s and
        // restarts. Daemon self-update (1.1.80+) takes care of the
        // long-running process; this banner just nudges the user.
        const ownRoot = dirname(dirname(fileURLToPath(import.meta.url)));
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

      // Skip bash invocations of our own admin slash subcommands. Their
      // command lines tend to carry the admin password verbatim (passed
      // on argv at first /mneme:setup, or via `echo -n <pw> |` on
      // legacy admin slashes), and these calls produce zero project
      // signal. Layer A's literal-redactor catches the password AFTER
      // the first setup; this skip is the protection FOR that first
      // setup and a belt against accidental capture afterward.
      if (
        toolName === "Bash" &&
        toolInput &&
        typeof (toolInput as Record<string, unknown>).command === "string" &&
        /scripts\/slash\.ts["']?\s+(setup|status|machines|revoke)\b/.test(
          (toolInput as Record<string, unknown>).command as string,
        )
      ) {
        return;
      }

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

      // Scrub tool data BEFORE serializing so the 64KB size cap below
      // reflects real text content, not bloated binary. Without this, a
      // single ~50KB inline base64 screenshot sails just under the cap,
      // lands in the queue, then chokes Claude's batch extract API with
      // `invalid_request` once the daemon ships a batch of 20 captures.
      // scrubData detects Anthropic image/document content blocks and
      // replaces the base64 `data` field with a `[redacted: N base64 chars]`
      // stub while preserving the surrounding shape.
      const cleanedInput = scrubData(toolInput);
      const cleanedResp = scrubData(toolResp);
      const observation = JSON.stringify({
        tool: toolName,
        input: cleanedInput,
        result: cleanedResp,
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
  process.stderr.write(`mneme-hook[${event}]: ${err instanceof Error ? err.message : err}\n`);
  process.exit(0);
});
