// Tests for the plugin config layer: blacklist patterns and the
// self-healing migration that strips legacy claudeOauthToken from disk.
//
// loadConfig() reads via os.homedir(), which on macOS caches $HOME at
// process startup — so the migration test runs in a spawned subprocess
// with HOME pre-set rather than mutating process.env mid-run.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isBlacklistedPath } from "../src/core/config.ts";

describe("isBlacklistedPath", () => {
  test("blocks the user's global .claude config dir", () => {
    expect(isBlacklistedPath("/Users/x/.claude/settings.json")).toBe(true);
  });

  test("blocks claude-mem and other .claude* sibling dirs", () => {
    expect(isBlacklistedPath("/Users/x/.claude-mem/cache")).toBe(true);
  });

  test("blocks .claude/projects/ subtree (auto-memory location)", () => {
    expect(isBlacklistedPath("/Users/x/.claude/projects/foo")).toBe(true);
  });

  test("does NOT block .claude/worktrees/ (real git worktree under a repo)", () => {
    expect(isBlacklistedPath("/Volumes/Drive/Mneme/.claude/worktrees/feature-x")).toBe(false);
  });

  test("does NOT block subpaths inside a .claude/worktrees/ tree", () => {
    expect(
      isBlacklistedPath("/Volumes/Drive/Mneme/.claude/worktrees/feature-x/packages/server"),
    ).toBe(false);
  });

  test("blocks /tmp and /private/var/folders", () => {
    expect(isBlacklistedPath("/tmp/foo")).toBe(true);
    expect(isBlacklistedPath("/private/var/folders/xy/cache")).toBe(true);
  });

  test("does NOT block ordinary project paths", () => {
    expect(isBlacklistedPath("/Users/x/d/service-wallet-helper")).toBe(false);
  });
});

describe("loadConfig self-healing migration (claudeOauthToken strip)", () => {
  // Runs loadConfig in a fresh Bun subprocess so os.homedir() resolves to
  // a fixture dir rather than the dev machine's real $HOME.
  test("strips claudeOauthToken from in-memory result AND rewrites disk", async () => {
    const fakeHome = mkdtempSync(join(tmpdir(), "mneme-cfg-home-"));
    const mnemeDir = join(fakeHome, ".mneme");
    mkdirSync(mnemeDir, { mode: 0o700 });
    const cfgPath = join(mnemeDir, "config.json");
    writeFileSync(
      cfgPath,
      JSON.stringify({
        server: { url: "https://example" },
        auth: { key: "k" },
        machine: { id: "m" },
        daemon: { port: 5390, agent_provider: "claude", claudeOauthToken: "sk-ant-leaked" },
      }),
      { mode: 0o600 },
    );
    chmodSync(cfgPath, 0o600);

    const cfgModule = join(import.meta.dir, "..", "src", "core", "config.ts");
    const proc = Bun.spawnSync({
      cmd: [
        "bun",
        "-e",
        `import { loadConfig } from "${cfgModule}";
         const c = loadConfig();
         console.log(JSON.stringify({ daemon: c.daemon }));`,
      ],
      env: { ...process.env, HOME: fakeHome },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(proc.exitCode).toBe(0);

    const stdout = new TextDecoder().decode(proc.stdout);
    const inMem = JSON.parse(stdout.trim()) as {
      daemon?: { claudeOauthToken?: string };
    };
    expect(inMem.daemon?.claudeOauthToken).toBeUndefined();

    const onDisk = JSON.parse(readFileSync(cfgPath, "utf8")) as {
      daemon?: { claudeOauthToken?: string };
    };
    expect(onDisk.daemon?.claudeOauthToken).toBeUndefined();
  });

  test("leaves clean configs untouched", async () => {
    const fakeHome = mkdtempSync(join(tmpdir(), "mneme-cfg-clean-"));
    const mnemeDir = join(fakeHome, ".mneme");
    mkdirSync(mnemeDir, { mode: 0o700 });
    const cfgPath = join(mnemeDir, "config.json");
    const cleanConfig = {
      server: { url: "https://example" },
      auth: { key: "k" },
      machine: { id: "m" },
      daemon: { port: 5390, agent_provider: "claude" },
    };
    writeFileSync(cfgPath, JSON.stringify(cleanConfig), { mode: 0o600 });
    chmodSync(cfgPath, 0o600);
    const beforeMtime = readFileSync(cfgPath);

    const cfgModule = join(import.meta.dir, "..", "src", "core", "config.ts");
    const proc = Bun.spawnSync({
      cmd: ["bun", "-e", `import { loadConfig } from "${cfgModule}"; loadConfig();`],
      env: { ...process.env, HOME: fakeHome },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(proc.exitCode).toBe(0);

    const afterMtime = readFileSync(cfgPath);
    expect(afterMtime.toString()).toBe(beforeMtime.toString());
  });
});
