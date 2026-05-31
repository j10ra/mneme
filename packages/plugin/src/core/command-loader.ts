// Harness-neutral loader that turns the Claude Code slash-command markdowns
// (commands/*.md) into Pi command specs. The markdowns are the single source
// of truth; this adapts them for Pi at load time:
//   - ${CLAUDE_PLUGIN_ROOT} (a CC-only env var Pi never sets) -> the resolved
//     plugin root, so the `bun .../src/claude/slash.ts` invocations work.
//   - the CC MCP tool name -> Pi's bare tool name (mneme_sql).
// The Pi extension (src/pi/commands.ts) registers each spec via
// registerCommand, injecting the adapted body as a user message on invoke.
//
// Node-builtin only, so it runs unchanged under Pi's toolchain.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Pi's built-in command names. A Mneme command whose filename collides with
 *  one of these is registered with an `mneme-` prefix instead of shadowing it. */
export const RESERVED_PI_COMMANDS = new Set<string>([
  "changelog",
  "clone",
  "compact",
  "copy",
  "fork",
  "hotkeys",
  "login",
  "logout",
  "model",
  "new",
  "quit",
  "reload",
  "resume",
  "scoped-models",
  "session",
  "settings",
  "share",
  "tree",
]);

/** Commands that don't make sense in Pi. `setup` mints the per-machine token
 *  and is a Claude Code bootstrap step; Pi reuses the ~/.mneme/config.json it
 *  produced. */
export const SKIP_COMMANDS = new Set<string>(["setup"]);

const CC_MCP_TOOL = "mcp__plugin_mneme_mneme__mneme_sql";
const PI_TOOL = "mneme_sql";

export type CommandSpec = { base: string; description: string; body: string };

/** Split YAML-ish frontmatter from the markdown body. Only the keys we use
 *  (description, argument-hint) are read; everything else is ignored. */
export function parseCommandFile(raw: string): {
  description: string;
  argumentHint: string;
  body: string;
} {
  if (!raw.startsWith("---")) return { description: "", argumentHint: "", body: raw };
  const end = raw.indexOf("\n---", 3);

  if (end === -1) return { description: "", argumentHint: "", body: raw };
  const fm = raw.slice(3, end);
  const body = raw.slice(end + 4).replace(/^\n+/, "");
  const meta: Record<string, string> = {};

  for (const line of fm.split("\n")) {
    const m = line.match(/^([a-zA-Z-]+):\s*(.*)$/);

    if (m?.[1]) meta[m[1]] = (m[2] ?? "").trim().replace(/^["']|["']$/g, "");
  }

  return {
    description: meta.description ?? "",
    argumentHint: meta["argument-hint"] ?? "",
    body,
  };
}

/** Rewrite CC-specific references so the body works under Pi. */
export function adaptForPi(body: string, pluginRoot: string): string {
  return body
    .split("${CLAUDE_PLUGIN_ROOT}")
    .join(pluginRoot)
    .split("$CLAUDE_PLUGIN_ROOT")
    .join(pluginRoot)
    .split(CC_MCP_TOOL)
    .join(PI_TOOL);
}

/** Substitute slash-command argument tokens, matching Pi's prompt-template
 *  semantics: $ARGUMENTS / $@ (all args), $1.. (positional), ${@:N[:L]}. */
export function substituteArgs(body: string, args: string): string {
  const all = args.trim();
  const parts = all.length ? all.split(/\s+/) : [];
  let out = body.split("$ARGUMENTS").join(all).split("$@").join(all);

  out = out.replace(/\$\{@:(\d+)(?::(\d+))?\}/g, (_m, n: string, l?: string) => {
    const start = Number(n) - 1;
    const slice = l ? parts.slice(start, start + Number(l)) : parts.slice(start);

    return slice.join(" ");
  });
  out = out.replace(/\$(\d+)/g, (_m, n: string) => parts[Number(n) - 1] ?? "");

  return out;
}

/** Pick a non-colliding command name: bare unless it shadows a Pi built-in or
 *  an already-registered command, in which case prefix with `mneme-`. */
export function resolveCommandName(base: string, taken: Set<string>): string {
  if (RESERVED_PI_COMMANDS.has(base) || taken.has(base)) return `mneme-${base}`;

  return base;
}

/** Read commands/*.md and produce Pi-adapted specs (name collision-resolution
 *  is deferred to the caller, which holds the live registered-command set). */
export function loadCommandSpecs(commandsDir: string, pluginRoot: string): CommandSpec[] {
  let files: string[];

  try {
    files = readdirSync(commandsDir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }

  const specs: CommandSpec[] = [];

  for (const file of files.sort()) {
    const base = file.replace(/\.md$/, "");

    if (SKIP_COMMANDS.has(base)) continue;
    let raw: string;

    try {
      raw = readFileSync(join(commandsDir, file), "utf8");
    } catch {
      continue;
    }

    const { description, argumentHint, body } = parseCommandFile(raw);
    const desc = description || `Mneme: ${base}`;

    specs.push({
      base,
      description: argumentHint ? `${desc}  ${argumentHint}` : desc,
      body: adaptForPi(body, pluginRoot),
    });
  }

  return specs;
}
