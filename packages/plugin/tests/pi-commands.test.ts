// Tests for the Pi command loader: it adapts the shared commands/*.md (the
// single source of truth, also used by Claude Code) for Pi at load time.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  adaptForPi,
  loadCommandSpecs,
  parseCommandFile,
  resolveCommandName,
  SKIP_COMMANDS,
  substituteArgs,
} from "../src/core/command-loader.ts";

const PLUGIN_ROOT = join(import.meta.dir, "..");
const COMMANDS_DIR = join(PLUGIN_ROOT, "commands");

describe("parseCommandFile", () => {
  test("extracts description + argument-hint and strips frontmatter", () => {
    const raw = `---\ndescription: Do a thing\nargument-hint: <id>\nscope: user\n---\n\nBody $ARGUMENTS here`;
    const { description, argumentHint, body } = parseCommandFile(raw);
    expect(description).toBe("Do a thing");
    expect(argumentHint).toBe("<id>");
    expect(body).toBe("Body $ARGUMENTS here");
  });
  test("handles a body with no frontmatter", () => {
    const { description, body } = parseCommandFile("just a body");
    expect(description).toBe("");
    expect(body).toBe("just a body");
  });
});

describe("adaptForPi", () => {
  test("rewrites the CC plugin-root var and MCP tool name", () => {
    const out = adaptForPi(
      'bun "${CLAUDE_PLUGIN_ROOT}/scripts/slash.ts" memory then mcp__plugin_mneme_mneme__mneme_sql',
      "/abs/plugin",
    );
    expect(out).toContain('bun "/abs/plugin/scripts/slash.ts" memory');
    expect(out).toContain("mneme_sql");
    expect(out).not.toContain("CLAUDE_PLUGIN_ROOT");
    expect(out).not.toContain("mcp__plugin_mneme");
  });
});

describe("substituteArgs", () => {
  test("$ARGUMENTS and $@ get all args", () => {
    expect(substituteArgs("x: $ARGUMENTS", "a b c")).toBe("x: a b c");
    expect(substituteArgs("x: $@", "a b")).toBe("x: a b");
  });
  test("positional and sliced args", () => {
    expect(substituteArgs("$1 / $2", "a b c")).toBe("a / b");
    expect(substituteArgs("${@:2}", "a b c")).toBe("b c");
    expect(substituteArgs("${@:2:1}", "a b c")).toBe("b");
  });
  test("missing positional resolves empty", () => {
    expect(substituteArgs("[$3]", "a")).toBe("[]");
  });
});

describe("resolveCommandName", () => {
  test("prefixes Pi built-in collisions", () => {
    expect(resolveCommandName("resume", new Set())).toBe("mneme-resume");
  });
  test("prefixes already-registered collisions", () => {
    expect(resolveCommandName("memory", new Set(["memory"]))).toBe("mneme-memory");
  });
  test("keeps non-colliding names bare", () => {
    expect(resolveCommandName("memory", new Set())).toBe("memory");
    expect(resolveCommandName("recall", new Set())).toBe("recall");
  });
});

describe("loadCommandSpecs (real commands dir)", () => {
  const specs = loadCommandSpecs(COMMANDS_DIR, "/abs/plugin");

  test("loads the shipped commands and skips setup", () => {
    expect(specs.length).toBeGreaterThan(10);
    const bases = specs.map((s) => s.base);
    expect(bases).toContain("memory");
    expect(bases).toContain("recall");
    for (const skip of SKIP_COMMANDS) expect(bases).not.toContain(skip);
  });

  test("every spec is fully adapted (no CC-only references leak)", () => {
    for (const s of specs) {
      expect(s.body).not.toContain("CLAUDE_PLUGIN_ROOT");
      expect(s.body).not.toContain("mcp__plugin_mneme");
      expect(s.description.length).toBeGreaterThan(0);
    }
  });
});
