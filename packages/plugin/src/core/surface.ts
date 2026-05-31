// Harness-neutral surface layer — the read-path "push" that hands an agent
// its relevance-ranked memory corpus at session start, plus the two renderers
// that split it into the agent's two audiences:
//
//   renderSurfaceForLLM   → the FULL surface (every row) + a reminder of total
//                           corpus size, glyph legend, and how to unfold the
//                           rest. This is what the model reads.
//   summariseSurfaceForUser → a COMPACT banner: repo, machines, since-last
//                           counts, pinned rows, a flavor line. This is what
//                           the human sees. No raw memory rows.
//
// Shared by every harness adapter — Claude Code's SessionStart hook
// (src/claude/hook.ts) and Pi's session_start handler (src/pi/register.ts) —
// so the surface and both renderings stay identical across harnesses.
// fetchSurface returns "" on any failure (fail-open: a surface miss must never
// block a session).

import { type MnemeConfig, serverUrl } from "./config.ts";

const SURFACE_TIMEOUT_MS = 5000;

export type FetchSurfaceOptions = {
  /** Repos in scope for this session (drives relevance ranking). */
  repos: string[];
  /** Harness session id, for surface coherence across a multi-turn session. */
  sessionId?: string | null;
  /** Tags the request for server-side telemetry (e.g. "hook", "pi"). */
  source?: string;
};

export async function fetchSurface(
  cfg: MnemeConfig,
  { repos, sessionId = null, source = "hook" }: FetchSurfaceOptions,
): Promise<string> {
  try {
    const resp = await fetch(serverUrl(cfg, "/api/session/start"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.auth.key}`,
        "X-Mneme-Source": source,
      },
      body: JSON.stringify({
        machine_id: cfg.machine.id,
        repos,
        session_id: sessionId,
      }),
      signal: AbortSignal.timeout(SURFACE_TIMEOUT_MS),
    });

    if (!resp.ok) return "";
    const data = (await resp.json()) as { rendered?: string };

    return data.rendered ?? "";
  } catch {
    return "";
  }
}

/** UTF-8 byte length — the real context cost of a string. Portable across
 *  Node/Bun (avoids Buffer); used to report the injected surface size. */
export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** The FULL surface the LLM reads: a reminder prefix + the markdown stripped
 *  for plain-text rendering. */
export function renderSurfaceForLLM(surface: string): string {
  return prefixSurfaceForLLM(surface, formatSurfaceForTerminal(surface));
}

// ── renderers (moved here from the Claude hook so Pi shares them) ──────────

/** Plain-text the markdown surface for terminal/plain rendering. Harnesses
 *  that print hook output verbatim (Claude Code) show `##`/`**`/`_..._` as
 *  literal characters; strip them so the surface reads cleanly. */
export function formatSurfaceForTerminal(surface: string): string {
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

/** UTF-8 byte size rendered as B / KB / MB. Kept terse — lands in the banner. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** User-visible status banner. Header + corpus totals + top pinned rows
 *  (stripped of UUIDs) + a flavor line reporting how many bytes the full
 *  surface injects into the LLM context. The LLM gets the full surface
 *  separately via renderSurfaceForLLM — including the auto-derived Rules
 *  section, which stays LLM-only; the banner shows only pinned rows. */
export function summariseSurfaceForUser(surface: string, injectedBytes: number): string {
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
 *  interpret row symbols on first read, without loading the using-mneme
 *  skill's references. Must stay in sync with KIND_GLYPH in
 *  packages/server/src/services/surface.ts. */
const KIND_LEGEND =
  "🔴 bugfix · 🟣 feature · ⚖️ decision · 🔵 discovery · 💬 preference · " +
  "🚧 constraint · 🚨 security_alert · 📎 reference · 🎯 summary · " +
  "🧩 cluster · 🧠 claude_memory · 📝 note";

/** LLM-side reminder prepended to the full surface. Tells the agent what's in
 *  the corpus, how to reach the rest, and what every glyph means. Falls back
 *  to the bare surface if parsing failed or no sections matched. */
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
