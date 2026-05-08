// Daemon install scaffolding tests. The generators are pure: given a
// DaemonInstallConfig, they return a service config string. The execute
// path (launchctl / systemctl / schtasks) is exercised manually during
// install on each machine.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildLaunchdPlist,
  buildServiceConfig,
  buildSystemdUnit,
  buildWindowsTaskXml,
  depsSignature,
  findReusableNodeModules,
  isDaemonConfigStale,
  pickFreePortDeterministic,
  serviceConfigPath,
  startCommandsFor,
} from "../scripts/daemon-install.ts";

const cfg = {
  pluginRoot: "/Users/jetz/.claude/plugins/cache/j10ra-mneme/mneme/1.0.45",
  daemonPort: 53121,
  bunPath: "/Users/jetz/.bun/bin/bun",
};

describe("buildLaunchdPlist", () => {
  test("includes the bun path, daemon entry, and KeepAlive=true", () => {
    const plist = buildLaunchdPlist(cfg);
    expect(plist).toContain(cfg.bunPath);
    expect(plist).toContain(`${cfg.pluginRoot}/daemon.js`);
    expect(plist).toContain("<key>KeepAlive</key>");
    expect(plist).toContain("dev.mneme.daemon");
  });

  test("omits CLAUDE_EXECUTABLE_PATH when no claudePath provided", () => {
    const plist = buildLaunchdPlist(cfg);
    expect(plist).not.toContain("CLAUDE_EXECUTABLE_PATH");
  });

  test("injects CLAUDE_EXECUTABLE_PATH inside EnvironmentVariables when set", () => {
    const claudePath = "/Users/jetz/.bun/bin/claude";
    const plist = buildLaunchdPlist({ ...cfg, claudePath });
    expect(plist).toContain("<key>CLAUDE_EXECUTABLE_PATH</key>");
    expect(plist).toContain(`<string>${claudePath}</string>`);
    // Sanity check it's inside the EnvironmentVariables dict, not floating elsewhere
    const envBlock = plist.slice(
      plist.indexOf("<key>EnvironmentVariables</key>"),
      plist.indexOf("</dict>\n</dict>"),
    );
    expect(envBlock).toContain("CLAUDE_EXECUTABLE_PATH");
  });
});

describe("buildSystemdUnit", () => {
  test("declares the right ExecStart and Restart=on-failure", () => {
    const unit = buildSystemdUnit(cfg);
    expect(unit).toContain(`ExecStart=${cfg.bunPath} run`);
    expect(unit).toContain("Restart=on-failure");
    expect(unit).toContain("WantedBy=default.target");
  });

  test("omits CLAUDE_EXECUTABLE_PATH when no claudePath provided", () => {
    const unit = buildSystemdUnit(cfg);
    expect(unit).not.toContain("CLAUDE_EXECUTABLE_PATH");
  });

  test("injects Environment=CLAUDE_EXECUTABLE_PATH=… when set", () => {
    const claudePath =
      "/home/jetz/.nvm/versions/node/v24.11.1/bin/claude";
    const unit = buildSystemdUnit({ ...cfg, claudePath });
    expect(unit).toContain(`Environment=CLAUDE_EXECUTABLE_PATH=${claudePath}`);
  });
});

describe("buildWindowsTaskXml", () => {
  test("includes a LogonTrigger and the bun command", () => {
    const xml = buildWindowsTaskXml(cfg);
    expect(xml).toContain("<LogonTrigger>");
    expect(xml).toContain("<Command>" + cfg.bunPath);
    expect(xml).toContain("<RestartOnFailure>");
  });
});

describe("serviceConfigPath", () => {
  test("darwin lands under ~/Library/LaunchAgents", () => {
    expect(serviceConfigPath("darwin")).toMatch(/Library\/LaunchAgents/);
  });
  test("linux lands under ~/.config/systemd/user", () => {
    expect(serviceConfigPath("linux")).toMatch(
      /\.config\/systemd\/user\/mneme-daemon\.service$/,
    );
  });
  test("win32 lands under AppData/Roaming/Mneme/daemon", () => {
    expect(serviceConfigPath("win32")).toMatch(/AppData\/Roaming\/Mneme/);
  });
});

describe("buildServiceConfig", () => {
  test("dispatches to the right generator per platform", () => {
    expect(buildServiceConfig("darwin", cfg)).toContain("<plist");
    expect(buildServiceConfig("linux", cfg)).toContain("[Service]");
    expect(buildServiceConfig("win32", cfg)).toContain("<Task ");
  });
});

describe("startCommandsFor", () => {
  test("darwin uses launchctl load/unload", () => {
    const cmds = startCommandsFor("darwin");
    expect(cmds.some((c) => c.includes("launchctl load"))).toBe(true);
  });
  test("linux uses systemctl --user", () => {
    const cmds = startCommandsFor("linux");
    expect(cmds.every((c) => c.startsWith("systemctl --user"))).toBe(true);
  });
  test("win32 uses schtasks", () => {
    const cmds = startCommandsFor("win32");
    expect(cmds.some((c) => c.startsWith("schtasks /Create"))).toBe(true);
  });
});

describe("isDaemonConfigStale", () => {
  // Build a fake fs that returns a fixed config string, so each test can
  // assert what the predicate does against a known service-config layout
  // without writing real files.
  function fakeFs(content: string | null) {
    return {
      existsSync: (_p: string) => content !== null,
      readFileSync: (_p: string, _enc: "utf8") =>
        content !== null ? content : "",
    };
  }

  const PLUGIN_ROOT_NEW =
    "/Users/jetz/.claude/plugins/cache/j10ra-mneme/mneme/1.0.65";
  const PLUGIN_ROOT_OLD =
    "/Users/jetz/.claude/plugins/cache/j10ra-mneme/mneme/1.0.62";

  test("missing service config returns false (not stale, not installed)", () => {
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(null), "darwin"),
    ).toBe(false);
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(null), "linux"),
    ).toBe(false);
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(null), "win32"),
    ).toBe(false);
  });

  test("darwin: detects stale plist, ignores fresh plist", () => {
    const stalePlist = buildLaunchdPlist({
      pluginRoot: PLUGIN_ROOT_OLD,
      daemonPort: 53121,
      bunPath: "/Users/jetz/.bun/bin/bun",
    });
    const freshPlist = buildLaunchdPlist({
      pluginRoot: PLUGIN_ROOT_NEW,
      daemonPort: 53121,
      bunPath: "/Users/jetz/.bun/bin/bun",
    });
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(stalePlist), "darwin"),
    ).toBe(true);
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(freshPlist), "darwin"),
    ).toBe(false);
  });

  test("linux: detects stale systemd unit, ignores fresh unit", () => {
    const staleUnit = buildSystemdUnit({
      pluginRoot: PLUGIN_ROOT_OLD,
      daemonPort: 53121,
      bunPath: "/home/jetz/.bun/bin/bun",
    });
    const freshUnit = buildSystemdUnit({
      pluginRoot: PLUGIN_ROOT_NEW,
      daemonPort: 53121,
      bunPath: "/home/jetz/.bun/bin/bun",
    });
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(staleUnit), "linux"),
    ).toBe(true);
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(freshUnit), "linux"),
    ).toBe(false);
  });

  test("linux: matches even when bunPath has changed (only daemon path matters)", () => {
    // simulate a bun upgrade: same pluginRoot in ExecStart, different bun
    const unit = buildSystemdUnit({
      pluginRoot: PLUGIN_ROOT_NEW,
      daemonPort: 53121,
      bunPath: "/home/jetz/.bun/bin/bun-old-version",
    });
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(unit), "linux"),
    ).toBe(false);
  });

  test("win32: detects stale Task XML, ignores fresh", () => {
    const staleXml = buildWindowsTaskXml({
      pluginRoot: PLUGIN_ROOT_OLD,
      daemonPort: 53121,
      bunPath: "C:\\Users\\jetz\\.bun\\bin\\bun.exe",
    });
    const freshXml = buildWindowsTaskXml({
      pluginRoot: PLUGIN_ROOT_NEW,
      daemonPort: 53121,
      bunPath: "C:\\Users\\jetz\\.bun\\bin\\bun.exe",
    });
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(staleXml), "win32"),
    ).toBe(true);
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(freshXml), "win32"),
    ).toBe(false);
  });

  test("darwin: substring of pluginRoot inside another tag doesn't false-match", () => {
    // A plist where the new pluginRoot path appears in some other place
    // (e.g. a comment) but NOT inside <string>...</string> — should still
    // be flagged stale because the actual ProgramArguments still points
    // at the old path.
    const stalePlist = buildLaunchdPlist({
      pluginRoot: PLUGIN_ROOT_OLD,
      daemonPort: 53121,
      bunPath: "/Users/jetz/.bun/bin/bun",
    });
    const polluted = stalePlist.replace(
      "</plist>",
      `  <!-- ${PLUGIN_ROOT_NEW}/daemon.js earlier ran here -->\n</plist>`,
    );
    expect(
      isDaemonConfigStale(PLUGIN_ROOT_NEW, fakeFs(polluted), "darwin"),
    ).toBe(true);
  });
});

describe("depsSignature", () => {
  test("ignores version field changes", () => {
    const a = depsSignature(
      '{"name":"x","version":"1.0.64","dependencies":{"hono":"4"}}',
    );
    const b = depsSignature(
      '{"name":"x","version":"1.0.65","dependencies":{"hono":"4"}}',
    );
    expect(a).toBe(b);
  });

  test("differs when a dependency version changes", () => {
    const a = depsSignature('{"dependencies":{"hono":"4.12"}}');
    const b = depsSignature('{"dependencies":{"hono":"5.0"}}');
    expect(a).not.toBe(b);
  });

  test("differs when an optionalDependency is added", () => {
    const a = depsSignature('{"dependencies":{"hono":"4"}}');
    const b = depsSignature(
      '{"dependencies":{"hono":"4"},"optionalDependencies":{"sharp":"^0.32"}}',
    );
    expect(a).not.toBe(b);
  });

  test("differs when trustedDependencies changes", () => {
    const a = depsSignature('{"trustedDependencies":["sharp"]}');
    const b = depsSignature(
      '{"trustedDependencies":["sharp","onnxruntime-node"]}',
    );
    expect(a).not.toBe(b);
  });

  test("falls back to raw bytes on malformed JSON", () => {
    const a = depsSignature("{this is not json");
    const b = depsSignature("{this is not json");
    const c = depsSignature("{neither is this");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("findReusableNodeModules", () => {
  let cacheRoot: string;

  beforeEach(() => {
    // Simulate Claude Code's plugin cache layout:
    //   <cacheRoot>/<version>/{package.json, node_modules?}
    cacheRoot = mkdtempSync(join(tmpdir(), "mneme-cache-"));
  });

  afterEach(() => {
    rmSync(cacheRoot, { recursive: true, force: true });
  });

  function makeVersionDir(
    version: string,
    pkg: string,
    withNodeModules: boolean,
  ): string {
    const dir = join(cacheRoot, version);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), pkg);
    if (withNodeModules) {
      mkdirSync(join(dir, "node_modules"));
      writeFileSync(join(dir, "node_modules", ".keep"), "");
    }
    return dir;
  }

  test("returns null when no sibling versions exist", async () => {
    const me = makeVersionDir("1.0.65", '{"name":"mneme"}', false);
    expect(await findReusableNodeModules(me)).toBe(null);
  });

  test("returns null when sibling deps signature differs", async () => {
    makeVersionDir(
      "1.0.64",
      '{"name":"mneme","dependencies":{"hono":"4.12.18"}}',
      true,
    );
    const me = makeVersionDir(
      "1.0.65",
      '{"name":"mneme","dependencies":{"hono":"5.0.0"}}',
      false,
    );
    expect(await findReusableNodeModules(me)).toBe(null);
  });

  test("matches when only the version field differs (deps unchanged)", async () => {
    // Real-world case: every plugin patch bumps `version` but keeps
    // `dependencies` identical. The reuse path should still kick in.
    const sib = makeVersionDir(
      "1.0.64",
      '{"name":"mneme","version":"1.0.64","dependencies":{"hono":"4.12.18"}}',
      true,
    );
    const me = makeVersionDir(
      "1.0.65",
      '{"name":"mneme","version":"1.0.65","dependencies":{"hono":"4.12.18"}}',
      false,
    );
    expect(await findReusableNodeModules(me)).toBe(
      join(sib, "node_modules"),
    );
  });

  test("returns null when sibling has matching pkg but no node_modules", async () => {
    const pkg = '{"name":"mneme","deps":"same"}';
    makeVersionDir("1.0.64", pkg, false);
    const me = makeVersionDir("1.0.65", pkg, false);
    expect(await findReusableNodeModules(me)).toBe(null);
  });

  test("returns the sibling node_modules path when pkg matches and nm exists", async () => {
    const pkg = '{"name":"mneme","deps":"same"}';
    const sib = makeVersionDir("1.0.64", pkg, true);
    const me = makeVersionDir("1.0.65", pkg, false);
    expect(await findReusableNodeModules(me)).toBe(
      join(sib, "node_modules"),
    );
  });

  test("ignores own version dir (would be a self-reference)", async () => {
    const pkg = '{"name":"mneme"}';
    const me = makeVersionDir("1.0.65", pkg, true);
    // Only sibling is ourselves — should still return null
    expect(await findReusableNodeModules(me)).toBe(null);
  });

  test("picks the first matching sibling (any version is fine)", async () => {
    const pkg = '{"name":"mneme","deps":"locked"}';
    makeVersionDir("1.0.62", pkg, true);
    makeVersionDir("1.0.64", pkg, true);
    const me = makeVersionDir("1.0.65", pkg, false);
    const picked = await findReusableNodeModules(me);
    expect(picked).toMatch(/node_modules$/);
    // Either 1.0.62 or 1.0.64 — readdir order isn't guaranteed across platforms
    expect(picked).toMatch(/1\.0\.6(2|4)/);
  });
});

describe("pickFreePortDeterministic", () => {
  test("returns a port in [49152, 65535] for any machine_id", () => {
    for (let i = 0; i < 5; i++) {
      const port = pickFreePortDeterministic(crypto.randomUUID());
      expect(port).toBeGreaterThanOrEqual(49152);
      expect(port).toBeLessThan(65535);
    }
  });
  test("is stable for the same machine_id", () => {
    const a = pickFreePortDeterministic("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const b = pickFreePortDeterministic("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(a).toBe(b);
  });
});
