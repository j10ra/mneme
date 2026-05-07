// Daemon install scaffolding tests. The generators are pure: given a
// DaemonInstallConfig, they return a service config string. The execute
// path (launchctl / systemctl / schtasks) is exercised manually during
// install on each machine.

import { describe, expect, test } from "bun:test";
import {
  binaryAssetName,
  binaryCachePath,
  binaryDownloadUrl,
  buildLaunchdPlist,
  buildServiceConfig,
  buildSystemdUnit,
  buildWindowsTaskXml,
  fetchBinaryIfAvailable,
  pickFreePortDeterministic,
  serviceConfigPath,
  startCommandsFor,
} from "../scripts/daemon-install.ts";

const cfg = {
  pluginRoot: "/Users/jetz/.claude/plugins/cache/j10ra-mneme/mneme/1.0.45",
  daemonPort: 53121,
  bunPath: "/Users/jetz/.bun/bin/bun",
};

const binaryCfg = {
  ...cfg,
  binaryPath: "/Users/jetz/.mneme/bin/mneme-daemon-v1.0.59",
};

describe("buildLaunchdPlist", () => {
  test("includes the bun path, daemon entry, and KeepAlive=true", () => {
    const plist = buildLaunchdPlist(cfg);
    expect(plist).toContain(cfg.bunPath);
    expect(plist).toContain(`${cfg.pluginRoot}/daemon.js`);
    expect(plist).toContain("<key>KeepAlive</key>");
    expect(plist).toContain("dev.mneme.daemon");
  });
});

describe("buildSystemdUnit", () => {
  test("declares the right ExecStart and Restart=on-failure", () => {
    const unit = buildSystemdUnit(cfg);
    expect(unit).toContain(`ExecStart=${cfg.bunPath} run`);
    expect(unit).toContain("Restart=on-failure");
    expect(unit).toContain("WantedBy=default.target");
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

describe("binary mode generators", () => {
  test("buildLaunchdPlist with binaryPath omits bun + run + daemon.js", () => {
    const plist = buildLaunchdPlist(binaryCfg);
    expect(plist).toContain(binaryCfg.binaryPath);
    expect(plist).not.toContain("daemon.js");
    expect(plist).not.toMatch(/<string>run<\/string>/);
  });

  test("buildSystemdUnit with binaryPath uses ExecStart=<binary>", () => {
    const unit = buildSystemdUnit(binaryCfg);
    expect(unit).toContain(`ExecStart=${binaryCfg.binaryPath}`);
    expect(unit).not.toContain("daemon.js");
  });

  test("buildWindowsTaskXml with binaryPath omits Arguments content", () => {
    const xml = buildWindowsTaskXml(binaryCfg);
    expect(xml).toContain(`<Command>${binaryCfg.binaryPath}</Command>`);
    expect(xml).toContain("<Arguments></Arguments>");
  });
});

describe("binary download URL helpers", () => {
  test("binaryAssetName picks the right name per (platform, arch)", () => {
    expect(binaryAssetName("darwin", "arm64")).toBe(
      "mneme-daemon-darwin-arm64",
    );
    expect(binaryAssetName("darwin", "x64")).toBe("mneme-daemon-darwin-x64");
    expect(binaryAssetName("linux", "x64")).toBe("mneme-daemon-linux-x64");
    expect(binaryAssetName("linux", "arm64")).toBe(
      "mneme-daemon-linux-arm64",
    );
    expect(binaryAssetName("win32", "x64")).toBe(null);
  });

  test("binaryDownloadUrl normalizes versions with or without v prefix", () => {
    expect(
      binaryDownloadUrl("1.0.59", "mneme-daemon-darwin-arm64"),
    ).toBe(
      "https://github.com/j10ra/mneme/releases/download/v1.0.59/mneme-daemon-darwin-arm64",
    );
    expect(
      binaryDownloadUrl("v1.0.59", "mneme-daemon-darwin-arm64"),
    ).toBe(
      "https://github.com/j10ra/mneme/releases/download/v1.0.59/mneme-daemon-darwin-arm64",
    );
  });

  test("binaryCachePath lands under ~/.mneme/bin with a versioned name", () => {
    const p = binaryCachePath("1.0.59");
    expect(p).toMatch(/\.mneme\/bin\/mneme-daemon-v1\.0\.59$/);
  });
});

describe("fetchBinaryIfAvailable", () => {
  test("returns null when the GitHub release returns 404", async () => {
    const fakeFetch = (async () =>
      new Response("not found", { status: 404 })) as unknown as typeof fetch;
    const result = await fetchBinaryIfAvailable(
      "0.0.0-does-not-exist",
      fakeFetch,
    );
    expect(result).toBe(null);
  });

  test("returns null on network error", async () => {
    const fakeFetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const result = await fetchBinaryIfAvailable(
      "0.0.0-net-fail",
      fakeFetch,
    );
    expect(result).toBe(null);
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
