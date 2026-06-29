import { mnemeFn } from "@mneme/core";
import { RECALL_RANKING_COEF } from "../infra/config.ts";
import { sql } from "../infra/db.ts";

type SurfaceItem = {
  id: string;
  kind: string | null;
  importance: number;
  content: string;
  repo: string | null;
  machine_id: string;
  created_at: Date;
  cluster_title?: string | null;
};

export type SurfaceSection = {
  items: SurfaceItem[];
  total: number;
};

export type Surface = {
  repos: string[];
  pinned: SurfaceSection;
  rules: SurfaceSection;
  themes: SurfaceSection;
  decisions: SurfaceSection;
  sessions: SurfaceSection;
  supersededCount: number;
  delta: { since: Date; captures: number; memories: number } | null;
  rendered: string;
};

const EMPTY_SECTION: SurfaceSection = { items: [], total: 0 };
const EMPTY_SURFACE: Surface = {
  repos: [],
  pinned: EMPTY_SECTION,
  rules: EMPTY_SECTION,
  themes: EMPTY_SECTION,
  decisions: EMPTY_SECTION,
  sessions: EMPTY_SECTION,
  supersededCount: 0,
  delta: null,
  rendered: "",
};

// Row carries `total_count` from `COUNT(*) OVER ()` so each section returns
// {items, total} in one round trip — lets the renderer show "(3 of 12)"
// without a follow-up count query.
type Row = SurfaceItem & { total_count: string };

const toSection = (rows: Row[]): SurfaceSection => {
  const first = rows[0];

  return {
    items: rows.map(({ total_count: _t, ...r }) => r),
    total: first ? Number(first.total_count) : 0,
  };
};

/** Build the SessionStart surface for a set of repos (workspace = N repos,
 *  single repo = array of length 1). Cross-machine: filter by repo, union
 *  across all machines. The caller's `machineId` is used to enforce the
 *  privacy invariant: rows with `private=true` are visible only to the
 *  machine that captured them.
 *
 *  All section queries exclude `meta.superseded_by` rows: surfaced facts
 *  must be the current version. Old versions are still queryable via
 *  recall (rank-down × 0.3 applied in the using-mneme skill template);
 *  the surface is curated. */
export const buildSurface = mnemeFn(
  "surface.build",
  async (repos: string[], callerMachineId: string | null): Promise<Surface> => {
    if (repos.length === 0) return EMPTY_SURFACE;

    // Ranking on all four "by importance" sections adds the LTP term
    // (#37): `+ RECALL_RANKING_COEF * ln(1 + recall_weight)`. ln() bounds
    // the tail so a hot memory drifts above its peers without dominating.
    // sessions section stays chronological — recency is the intent.
    const pinnedQ = sql<Row[]>`
      SELECT id, kind, importance, content, repo, machine_id, created_at,
             COUNT(*) OVER () AS total_count
      FROM memories
      WHERE archived_at IS NULL
        AND (meta->>'pinned')::boolean = true
        AND (meta->>'superseded_by') IS NULL
        AND (repo = ANY(${repos}) OR repo IS NULL)
        AND (private = false OR machine_id = ${callerMachineId})
      ORDER BY (importance + ${RECALL_RANKING_COEF}::real * ln(1 + recall_weight)) DESC,
               created_at DESC
      LIMIT 5
    `;

    const rulesQ = sql<Row[]>`
      SELECT id, kind, importance, content, repo, machine_id, created_at,
             COUNT(*) OVER () AS total_count
      FROM memories
      WHERE archived_at IS NULL
        AND kind IN ('preference', 'constraint')
        AND importance >= 0.7
        AND (meta->>'superseded_by') IS NULL
        AND (repo = ANY(${repos}) OR repo IS NULL)
        AND (private = false OR machine_id = ${callerMachineId})
      ORDER BY (importance + ${RECALL_RANKING_COEF}::real * ln(1 + recall_weight)) DESC,
               created_at DESC
      LIMIT 3
    `;

    // Themes = LLM-distilled cluster summaries (dream worker output).
    // The most condensed signal Mneme produces — surface them above the
    // raw recent stream so the agent gets the synthesis before the noise.
    const themesQ = sql<Row[]>`
      SELECT id, kind, importance, content, repo, machine_id, created_at,
             meta->>'cluster_title' AS cluster_title,
             COUNT(*) OVER () AS total_count
      FROM memories
      WHERE archived_at IS NULL
        AND kind = 'cluster'
        AND repo = ANY(${repos})
        AND (meta->>'superseded_by') IS NULL
        AND (private = false OR machine_id = ${callerMachineId})
      ORDER BY (importance + ${RECALL_RANKING_COEF}::real * ln(1 + recall_weight)) DESC,
               created_at DESC
      LIMIT 3
    `;

    // Capped to keep total surface ≤ 20 items after Themes joins the
    // budget.
    const decisionsQ = sql<Row[]>`
      SELECT id, kind, importance, content, repo, machine_id, created_at,
             COUNT(*) OVER () AS total_count
      FROM memories
      WHERE archived_at IS NULL
        AND repo = ANY(${repos})
        AND kind IN ('decision', 'feature', 'bugfix', 'discovery')
        AND importance >= 0.6
        AND created_at > now() - interval '14 days'
        AND (meta->>'superseded_by') IS NULL
        AND (private = false OR machine_id = ${callerMachineId})
      ORDER BY (importance + ${RECALL_RANKING_COEF}::real * ln(1 + recall_weight)) DESC,
               created_at DESC
      LIMIT 6
    `;

    const sessionsQ = sql<Row[]>`
      SELECT id, kind, importance, content, repo, machine_id, created_at,
             COUNT(*) OVER () AS total_count
      FROM memories
      WHERE archived_at IS NULL
        AND repo = ANY(${repos})
        AND kind = 'summary'
        AND (meta->>'superseded_by') IS NULL
        AND (private = false OR machine_id = ${callerMachineId})
      ORDER BY created_at DESC
      LIMIT 3
    `;

    const supersededQ = sql<{ n: string }[]>`
      SELECT COUNT(*)::text AS n FROM memories
      WHERE archived_at IS NULL
        AND repo = ANY(${repos})
        AND (meta->>'superseded_by') IS NOT NULL
        AND (private = false OR machine_id = ${callerMachineId})
    `;

    const [pinnedR, rulesR, themesR, decisionsR, sessionsR, supersededR] = await Promise.all([
      pinnedQ,
      rulesQ,
      themesQ,
      decisionsQ,
      sessionsQ,
      supersededQ,
    ]);

    const pinned = toSection(pinnedR);
    const rules = toSection(rulesR);
    const themes = toSection(themesR);
    const decisions = toSection(decisionsR);
    const sessions = toSection(sessionsR);
    const supersededCount = Number(supersededR[0]?.n ?? 0);

    const delta = await computeDelta(repos, callerMachineId);

    const machineIds = [
      ...new Set(
        [
          ...pinned.items,
          ...rules.items,
          ...themes.items,
          ...decisions.items,
          ...sessions.items,
        ].map((i) => i.machine_id),
      ),
    ];
    const machineNames =
      machineIds.length > 1 ? await loadMachineNames(machineIds) : new Map<string, string>();

    const rendered = renderSurface(
      {
        repos,
        pinned,
        rules,
        themes,
        decisions,
        sessions,
        supersededCount,
        delta,
      },
      machineNames,
    );

    return {
      repos,
      pinned,
      rules,
      themes,
      decisions,
      sessions,
      supersededCount,
      delta,
      rendered,
    };
  },
);

// Cutoff = most-recent `summary` memory on these repos. Anchors the
// "what's new" line to the last session boundary the agent saw, so the
// agent reads "12 captures, 7 memories since 5h ago" instead of an
// arbitrary 24h window. Returns null if no prior summary exists
// (brand-new repo) — the renderer then drops the line entirely.
async function computeDelta(
  repos: string[],
  callerMachineId: string | null,
): Promise<Surface["delta"]> {
  const cutRows = await sql<{ created_at: Date }[]>`
    SELECT created_at FROM memories
    WHERE archived_at IS NULL
      AND repo = ANY(${repos})
      AND kind = 'summary'
      AND (private = false OR machine_id = ${callerMachineId})
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const cut = cutRows[0];

  if (!cut) return null;
  const since = cut.created_at;

  const [capturesR, memoriesR] = await Promise.all([
    sql<{ n: string }[]>`
      SELECT COUNT(*)::text AS n FROM captures
      WHERE archived_at IS NULL
        AND repo = ANY(${repos})
        AND captured_at > ${since}
    `,
    sql<{ n: string }[]>`
      SELECT COUNT(*)::text AS n FROM memories
      WHERE archived_at IS NULL
        AND repo = ANY(${repos})
        AND created_at > ${since}
        AND (private = false OR machine_id = ${callerMachineId})
    `,
  ]);

  return {
    since,
    captures: Number(capturesR[0]?.n ?? 0),
    memories: Number(memoriesR[0]?.n ?? 0),
  };
}

// DISTINCT ON picks one name per machine_id, preferring active rows
// (revoked_at NULLS FIRST) and the most recent registration. Multiple
// active api_keys for the same machine_id is rare but legal — pick one
// rather than emit duplicates.
async function loadMachineNames(machineIds: string[]): Promise<Map<string, string>> {
  const rows = await sql<{ machine_id: string; name: string }[]>`
    SELECT DISTINCT ON (machine_id) machine_id, name
    FROM _ops.api_keys
    WHERE machine_id = ANY(${machineIds})
    ORDER BY machine_id, revoked_at NULLS FIRST, created_at DESC
  `;
  const m = new Map<string, string>();

  for (const r of rows) m.set(r.machine_id, slugify(r.name));

  return m;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");

// No length cap — surface is the most cache-friendly prompt slot.
const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

// Emoji per kind. Drives the visual scan in the rendered surface and lets the
// agent map kind → glyph at a glance. Unknown kinds fall back to a neutral dot.
const KIND_GLYPH: Record<string, string> = {
  bugfix: "🔴",
  feature: "🟣",
  decision: "⚖️",
  discovery: "🔵",
  preference: "💬",
  constraint: "🚧",
  security_alert: "🚨",
  reference: "📎",
  summary: "🎯",
  cluster: "🧩",
  claude_memory: "🧠",
  note: "📝",
  concept: "📘",
};
const glyph = (kind: string | null): string => (kind && KIND_GLYPH[kind]) || "•";

// Surface carries full UUIDs; agent queries `WHERE id = '<uuid>'`.
// Surface ingestion is LLM-side only — the user-visible status banner
// summarises counts and never renders row IDs, so token cost is paid
// where it adds value.

function relativeTime(d: Date): string {
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / 86_400_000);

  if (days === 0) {
    const hours = Math.floor(ms / 3_600_000);

    return hours === 0 ? "just now" : `${hours}h ago`;
  }

  if (days === 1) return "1d ago";
  if (days < 14) return `${days}d ago`;

  return d.toISOString().slice(0, 10);
}

const sectionHeader = (title: string, section: SurfaceSection): string => {
  const shown = section.items.length;

  return shown >= section.total
    ? `## ${title} (${shown})`
    : `## ${title} (${shown} of ${section.total})`;
};

type RenderInput = Omit<Surface, "rendered">;

function renderSurface(s: RenderInput, names: Map<string, string>): string {
  const allItems = [
    ...s.pinned.items,
    ...s.rules.items,
    ...s.themes.items,
    ...s.decisions.items,
    ...s.sessions.items,
  ];
  const machineCount = new Set(allItems.map((i) => i.machine_id)).size;
  const showMachine = machineCount > 1;

  const tag = (item: SurfaceItem): string => {
    if (!showMachine) return "";
    const n = names.get(item.machine_id);

    return n ? ` · @${n}` : "";
  };

  const lines: string[] = [];

  if (s.repos.length > 1) {
    lines.push(
      `# Mneme · workspace (${s.repos.length} repos) · across ${machineCount} machine${
        machineCount === 1 ? "" : "s"
      }`,
    );
    lines.push("");
    lines.push("**Active repos:**");
    for (const r of s.repos) lines.push(`- ${r}`);
  } else if (s.repos.length === 1) {
    lines.push(
      `# Mneme · ${s.repos[0]} · across ${machineCount} machine${machineCount === 1 ? "" : "s"}`,
    );
  }

  // Delta + supersede counter on one italic line under the header. Anchors
  // "what's new" at the most-recent summary boundary; supersede count tells
  // the agent the rank-down machinery has been doing work.
  const deltaParts: string[] = [];

  if (s.delta) {
    deltaParts.push(
      `Since last session (${relativeTime(s.delta.since)}): ${s.delta.captures} captures, ${s.delta.memories} memories`,
    );
  }

  if (s.supersededCount > 0) {
    deltaParts.push(`${s.supersededCount} superseded all-time`);
  }

  if (deltaParts.length > 0) {
    lines.push(`_${deltaParts.join(" · ")}_`);
  }

  const sectionsBefore = lines.length;

  if (s.pinned.items.length > 0) {
    lines.push("");
    lines.push(sectionHeader("Pinned", s.pinned));

    for (const i of s.pinned.items) {
      lines.push(
        `- [${i.id}] ${glyph(i.kind)} ${i.importance.toFixed(2)} ${collapse(i.content)}${tag(i)}`,
      );
    }
  }

  if (s.rules.items.length > 0) {
    lines.push("");
    lines.push(sectionHeader("Rules", s.rules));

    for (const i of s.rules.items) {
      lines.push(`- [${i.id}] ${glyph(i.kind)} ${collapse(i.content)}${tag(i)}`);
    }
  }

  if (s.themes.items.length > 0) {
    lines.push("");
    lines.push(sectionHeader("Themes", s.themes));

    for (const i of s.themes.items) {
      const title = i.cluster_title ? `**${collapse(i.cluster_title)}** — ` : "";

      lines.push(`- [${i.id}] ${glyph(i.kind)} ${title}${collapse(i.content)}${tag(i)}`);
    }
  }

  if (s.decisions.items.length > 0) {
    lines.push("");
    lines.push(sectionHeader("Recent (last 14 days)", s.decisions));

    for (const i of s.decisions.items) {
      lines.push(
        `- [${i.id}] ${relativeTime(i.created_at)} · ${glyph(i.kind)} ${collapse(i.content)}${tag(i)}`,
      );
    }
  }

  if (s.sessions.items.length > 0) {
    lines.push("");
    lines.push(sectionHeader("Recent sessions", s.sessions));

    for (const i of s.sessions.items) {
      lines.push(
        `- [${i.id}] ${relativeTime(i.created_at)} · ${glyph(i.kind)} ${collapse(i.content)}${tag(i)}`,
      );
    }
  }

  // No content sections beyond the header? Don't render anything; an empty
  // surface lets the agent start clean instead of showing a useless header.
  if (lines.length === sectionsBefore) return "";

  return `${lines.join("\n")}\n`;
}
