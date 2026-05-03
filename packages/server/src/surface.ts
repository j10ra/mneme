import { mnemeFn } from "@mneme/core";
import { sql } from "./db.ts";

type SurfaceItem = {
  id: string;
  kind: string | null;
  importance: number;
  content: string;
  repo: string | null;
  machine_id: string;
  created_at: Date;
};

export type Surface = {
  repos: string[];
  pinned: SurfaceItem[];
  rules: SurfaceItem[];
  decisions: SurfaceItem[];
  sessions: SurfaceItem[];
  rendered: string;
};

const EMPTY_SURFACE: Surface = {
  repos: [],
  pinned: [],
  rules: [],
  decisions: [],
  sessions: [],
  rendered: "",
};

/** Build the SessionStart surface for a set of repos (workspace = N repos,
 *  single repo = array of length 1). Cross-machine: filter by repo, union
 *  across all machines. */
export const buildSurface = mnemeFn(
  "surface.build",
  async (repos: string[]): Promise<Surface> => {
    if (repos.length === 0) return EMPTY_SURFACE;

    const pinned = await sql<SurfaceItem[]>`
      SELECT id, kind, importance, content, repo, machine_id, created_at
      FROM memories
      WHERE archived_at IS NULL
        AND (meta->>'pinned')::boolean = true
        AND (repo = ANY(${repos}) OR repo IS NULL)
      ORDER BY importance DESC, created_at DESC
      LIMIT 5
    `;

    const rules = await sql<SurfaceItem[]>`
      SELECT id, kind, importance, content, repo, machine_id, created_at
      FROM memories
      WHERE archived_at IS NULL
        AND kind IN ('preference', 'constraint')
        AND importance >= 0.7
      ORDER BY importance DESC, created_at DESC
      LIMIT 3
    `;

    const decisions = await sql<SurfaceItem[]>`
      SELECT id, kind, importance, content, repo, machine_id, created_at
      FROM memories
      WHERE archived_at IS NULL
        AND repo = ANY(${repos})
        AND kind IN ('decision', 'feature', 'bugfix', 'discovery')
        AND importance >= 0.6
        AND created_at > now() - interval '14 days'
      ORDER BY importance DESC, created_at DESC
      LIMIT 8
    `;

    const sessions = await sql<SurfaceItem[]>`
      SELECT id, kind, importance, content, repo, machine_id, created_at
      FROM memories
      WHERE archived_at IS NULL
        AND repo = ANY(${repos})
        AND kind = 'summary'
      ORDER BY created_at DESC
      LIMIT 3
    `;

    const rendered = renderSurface({ repos, pinned, rules, decisions, sessions });
    return { repos, pinned, rules, decisions, sessions, rendered };
  },
);

function oneLine(s: string, max = 140): string {
  const cleaned = s.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

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

function renderSurface(s: Omit<Surface, "rendered">): string {
  const machines = new Set(
    [...s.pinned, ...s.rules, ...s.decisions, ...s.sessions].map(
      (i) => i.machine_id,
    ),
  );
  const machineCount = machines.size;
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
      `# Mneme · ${s.repos[0]} · across ${machineCount} machine${
        machineCount === 1 ? "" : "s"
      }`,
    );
  }

  const sectionsBefore = lines.length;

  if (s.pinned.length > 0) {
    lines.push("");
    lines.push("## Pinned");
    for (const i of s.pinned) {
      lines.push(
        `- (${i.kind ?? "note"} · ${i.importance.toFixed(2)}) ${oneLine(i.content)}`,
      );
    }
  }

  if (s.rules.length > 0) {
    lines.push("");
    lines.push("## Rules");
    for (const i of s.rules) {
      lines.push(`- (${i.kind}) ${oneLine(i.content)}`);
    }
  }

  if (s.decisions.length > 0) {
    lines.push("");
    lines.push("## Recent (last 14 days)");
    for (const i of s.decisions) {
      lines.push(
        `- ${relativeTime(i.created_at)} · (${i.kind}) ${oneLine(i.content)}`,
      );
    }
  }

  if (s.sessions.length > 0) {
    lines.push("");
    lines.push("## Recent sessions");
    for (const i of s.sessions) {
      lines.push(`- ${relativeTime(i.created_at)} · ${oneLine(i.content, 110)}`);
    }
  }

  // No content sections beyond the header? Don't render anything; an empty
  // surface lets the agent start clean instead of showing a useless header.
  if (lines.length === sectionsBefore) return "";
  return `${lines.join("\n")}\n`;
}
