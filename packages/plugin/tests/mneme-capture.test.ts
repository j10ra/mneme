// Tests for the harness-neutral capture core used by the Pi extension.
// writeCapture is exercised against a temp outbox dir so nothing touches the
// real ~/.mneme queue.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MnemeConfig } from "../src/core/config.ts";
import {
  buildToolObservation,
  MAX_CAPTURE_BYTES,
  shouldSkipTool,
  truncate,
  writeCapture,
} from "../src/core/capture.ts";

const cfg = (over: Partial<MnemeConfig> = {}): MnemeConfig =>
  ({
    server: { url: "https://example.invalid" },
    auth: { key: "supersecretbearer123" },
    machine: { id: "m-test" },
    ...over,
  }) as MnemeConfig;

describe("shouldSkipTool", () => {
  test("skips the recall tool and anything mneme-named (recursion guard)", () => {
    expect(shouldSkipTool("mneme_sql")).toBe(true);
    expect(shouldSkipTool("Mneme")).toBe(true);
  });
  test("skips claude-mem tools", () => {
    expect(shouldSkipTool("claude-mem")).toBe(true);
    expect(shouldSkipTool("claude_mem_store")).toBe(true);
  });
  test("captures real work tools", () => {
    for (const t of ["bash", "read", "edit", "write", "grep", "find", "ls"]) {
      expect(shouldSkipTool(t)).toBe(false);
    }
  });
  test("ignores non-string tool names", () => {
    expect(shouldSkipTool(undefined)).toBe(false);
    expect(shouldSkipTool(42)).toBe(false);
  });
});

describe("buildToolObservation", () => {
  test("serializes a normal tool call", () => {
    const obs = buildToolObservation("read", { file_path: "/a.ts" }, [{ type: "text", text: "x" }]);

    expect(obs).not.toBeNull();
    const parsed = JSON.parse(obs as string);

    expect(parsed.tool).toBe("read");
    expect(parsed.isError).toBe(false);
  });
  test("returns null when the scrubbed observation is oversize", () => {
    const huge = "y".repeat(MAX_CAPTURE_BYTES + 1);

    expect(buildToolObservation("bash", { command: huge }, [])).toBeNull();
  });
});

describe("truncate", () => {
  test("leaves short strings intact", () => {
    expect(truncate("short", 100)).toBe("short");
  });
  test("marks truncation", () => {
    const out = truncate("z".repeat(50), 10);

    expect(out.startsWith("z".repeat(10))).toBe(true);
    expect(out).toContain("truncated");
  });
});

describe("writeCapture", () => {
  test("writes a capture file with the <ms>-<sha8> id shape", () => {
    const dir = mkdtempSync(join(tmpdir(), "mneme-outbox-"));
    const ok = writeCapture(
      cfg(),
      { source: "pi_prompt", content: "hello world" },
      {
        outboxDir: dir,
      },
    );

    expect(ok).toBe(true);
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

    expect(files.length).toBe(1);
    const file = files[0] as string;

    expect(file).toMatch(/^\d+-[0-9a-f]{8}\.json$/);
    const body = JSON.parse(readFileSync(join(dir, file), "utf8"));

    expect(body.source).toBe("pi_prompt");
    expect(body.content).toBe("hello world");
  });

  test("redacts this machine's literal bearer secret", () => {
    const dir = mkdtempSync(join(tmpdir(), "mneme-outbox-"));

    writeCapture(
      cfg(),
      { source: "pi_tool", content: "token=supersecretbearer123 end" },
      {
        outboxDir: dir,
      },
    );
    const file = readdirSync(dir).find((f) => f.endsWith(".json")) as string;
    const body = JSON.parse(readFileSync(join(dir, file), "utf8"));

    expect(body.content).not.toContain("supersecretbearer123");
    expect(body.content).toContain("[REDACTED:mneme_secret]");
  });

  test("creates the outbox dir if absent", () => {
    const dir = join(mkdtempSync(join(tmpdir(), "mneme-outbox-")), "nested", "captured");
    const ok = writeCapture(cfg(), { source: "pi_prompt", content: "x" }, { outboxDir: dir });

    expect(ok).toBe(true);
    expect(readdirSync(dir).length).toBe(1);
  });
});
