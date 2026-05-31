// @ts-nocheck — compiled by Pi's toolchain, not this repo's tsc. Kept outside
// tsconfig include globs for the same reason as register.ts.
//
// Pi-side slash commands. The analog of the Claude Code plugin's commands/*.md
// (which Pi never loads — it has no pi.commands manifest field). Rather than
// duplicate them, this loads the SAME markdowns at startup, adapts them for Pi
// (see ../core/command-loader.ts: ${CLAUDE_PLUGIN_ROOT} -> resolved root, CC
// MCP tool name -> mneme_sql), and registers each via pi.registerCommand. The
// handler injects the adapted body as a user message, so `/memory foo` behaves
// exactly like the Claude Code slash command: the agent resolves the args then
// runs the shared src/claude/slash.ts or calls the mneme_sql tool.
//
// The plugin root is resolved from this file's own location (import.meta.url),
// so the bun src/claude/slash.ts invocations point at THIS installed clone
// regardless of the agent's cwd. Bare names; collisions with Pi built-ins
// (e.g. /resume) are auto-prefixed to /mneme-<name>.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCommandSpecs, resolveCommandName, substituteArgs } from "../core/command-loader.ts";

// src/pi/commands.ts -> packages/plugin (the CC CLAUDE_PLUGIN_ROOT equivalent);
// three dirname() hops up from this file.
const PLUGIN_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const COMMANDS_DIR = join(PLUGIN_ROOT, "commands");

export default function mnemeCommands(pi) {
  const specs = loadCommandSpecs(COMMANDS_DIR, PLUGIN_ROOT);

  if (!specs.length) return;

  const taken = new Set();

  try {
    for (const c of pi.getCommands?.() ?? []) taken.add(c.name);
  } catch {
    // getCommands unavailable mid-load — fall back to built-in reserved set only.
  }

  for (const spec of specs) {
    const name = resolveCommandName(spec.base, taken);

    taken.add(name);
    pi.registerCommand(name, {
      description: spec.description,
      handler: async (args) => {
        pi.sendUserMessage(substituteArgs(spec.body, args ?? ""));
      },
    });
  }
}
