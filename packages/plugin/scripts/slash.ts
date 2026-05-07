#!/usr/bin/env bun
// Slash command dispatcher: /memory, /pin, /unpin.
// /recall and /summarise are agent-driven (use mneme.sql via MCP), no
// shell-out needed for those.

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir, hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  type MnemeConfig,
  loadConfig,
  machineFingerprint,
  saveConfig,
  serverUrl,
} from "./config.ts";
import {
  installDaemonService,
  pickFreePortDeterministic,
} from "./daemon-install.ts";
import { baseScope } from "./scope.ts";

async function readStdin(): Promise<string> {
  let buf = "";
  for await (const chunk of process.stdin as AsyncIterable<Buffer | string>) {
    buf += typeof chunk === "string" ? chunk : chunk.toString("utf8");
  }
  return buf.trim();
}

type CaptureResult = { id: string; deduped: boolean };

async function postCapture(
  cfg: MnemeConfig,
  body: Record<string, unknown>,
): Promise<CaptureResult> {
  const resp = await fetch(serverUrl(cfg, "/api/capture"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.auth.key}`,
      "X-Mneme-Source": "slash",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(
      `POST /api/capture failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`,
    );
  }
  return (await resp.json()) as CaptureResult;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MemoryResult = { id: string; created: boolean; pinned: boolean };

async function postMemory(
  cfg: MnemeConfig,
  body: Record<string, unknown>,
): Promise<MemoryResult> {
  const resp = await fetch(serverUrl(cfg, "/api/memory"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.auth.key}`,
      "X-Mneme-Source": "slash",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(
      `POST /api/memory failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`,
    );
  }
  return (await resp.json()) as MemoryResult;
}

async function memory(): Promise<void> {
  const text = await readStdin();
  if (!text) throw new Error("no memory text on stdin");
  const cfg = loadConfig();
  const r = await postCapture(cfg, {
    ...baseScope(cfg),
    source: "manual:/memory",
    content: text,
  });
  console.log(
    `✓ memory captured (id ${r.id}${r.deduped ? ", deduped" : ""})`,
  );
}

/** Pin: two paths.
 *  - <uuid>  → actuate pin on existing memory (capture + raw_meta.kind=pin)
 *  - <text>  → write a new pinned memory directly (POST /api/memory, pinned=true) */
async function pin(input: string): Promise<void> {
  if (!input) throw new Error("pin requires a memory id or fact text");
  const cfg = loadConfig();

  if (UUID_RE.test(input)) {
    const r = await postCapture(cfg, {
      ...baseScope(cfg),
      source: "manual",
      content: `pin ${input}`,
      raw_meta: { kind: "pin", target: input, value: true },
    });
    console.log(`✓ pinned memory ${input} (request id ${r.id})`);
    return;
  }

  const r = await postMemory(cfg, {
    ...baseScope(cfg),
    content: input,
    kind: "note",
    importance: 1.0,
    pinned: true,
  });
  console.log(
    `✓ ${r.created ? "wrote and pinned" : "re-pinned"} memory ${r.id}: "${input.slice(0, 80)}${input.length > 80 ? "…" : ""}"`,
  );
}

async function unpin(input: string): Promise<void> {
  if (!input) throw new Error("unpin requires a memory id");
  if (!UUID_RE.test(input)) {
    throw new Error(
      `unpin requires a memory uuid (got: "${input}"). Use mneme.sql to search pinned memories first, then unpin by id.`,
    );
  }
  const cfg = loadConfig();
  const r = await postCapture(cfg, {
    ...baseScope(cfg),
    source: "manual",
    content: `unpin ${input}`,
    raw_meta: { kind: "pin", target: input, value: false },
  });
  console.log(`✓ unpinned memory ${input} (request id ${r.id})`);
}

type RegisterResponse = {
  machine_id: string;
  machine_name: string;
  token: string;
  /** Server flag: true when the fingerprint matched an existing row and
   *  the token was rotated in place (machine_id reused). False on a
   *  fresh registration. Surfaced in the setup output so the user sees
   *  whether their existing identity was preserved. */
  reused_machine_id?: boolean;
};

/** Setup: POST /api/auth/register with admin password as bearer, get a
 *  per-machine token, write it to ~/.mneme/config.json. Sends a stable
 *  hardware fingerprint so re-running setup on the same machine reuses
 *  the existing machine_id (and the captures attached to it) instead of
 *  creating a parallel row. The token is always rotated; the identity
 *  is preserved when the fingerprint matches.
 *
 *  Existing config is preserved for `projects[]` only — machine
 *  id/name/token are replaced with what the server returns. */
async function setup(
  url: string,
  adminPassword: string,
  name?: string,
): Promise<void> {
  if (!url) throw new Error("server-url required");
  if (!adminPassword) throw new Error("admin-password required");

  const baseUrl = url.replace(/\/$/, "");
  const machineName =
    name ?? hostname().toLowerCase().split(".")[0] ?? "unknown";

  const fingerprint = machineFingerprint();
  const resp = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminPassword}`,
    },
    body: JSON.stringify({
      machine_name: machineName,
      ...(fingerprint ? { machine_fingerprint: fingerprint } : {}),
    }),
  });
  if (!resp.ok) {
    const detail = (await resp.text()).slice(0, 200);
    throw new Error(`POST /api/auth/register failed: ${resp.status} ${detail}`);
  }
  const reg = (await resp.json()) as RegisterResponse;

  const cfgDir = join(homedir(), ".mneme");
  const cfgPath = join(cfgDir, "config.json");

  // Preserve only `projects[]` from any prior config — the rest is replaced.
  let existing: Partial<MnemeConfig> = {};
  if (existsSync(cfgPath)) {
    try {
      existing = JSON.parse(readFileSync(cfgPath, "utf8")) as Partial<MnemeConfig>;
    } catch {
      // corrupt prior config — overwrite
    }
  }

  const daemonPort = pickFreePortDeterministic(reg.machine_id);

  // Write the daemon block up-front — the daemon's readConfig() throws
  // if it's missing, and installDaemonService below loads the plist
  // immediately (RunAtLoad=true) which races with this write. Older
  // versions deferred the daemon block until install succeeded, but
  // that left the daemon in a KeepAlive crash loop the first time it
  // was loaded. The hook is daemon-only now (no server fallback), so
  // a leftover daemon block from a failed install is harmless: the
  // daemon writes captures into outbox/capture/pending/ on disk and
  // the next successful daemon launch picks them up.
  const config: MnemeConfig = {
    server: { url: baseUrl },
    auth: { key: reg.token },
    machine: { id: reg.machine_id, name: reg.machine_name },
    daemon: {
      port: daemonPort,
      agent_provider: existing.daemon?.agent_provider ?? "claude",
    },
    ...(existing.projects ? { projects: existing.projects } : {}),
  };

  if (!existsSync(cfgDir)) mkdirSync(cfgDir, { recursive: true, mode: 0o700 });
  // Mode 0600 set at write time so the freshly-minted token never sits at
  // the default umask, not even between writeFile and chmod. If the file
  // already exists at 0600 from a prior setup, writeFile preserves its
  // existing mode (the `mode` option only applies on creation), so an
  // explicit chmod is still belt-and-suspenders.
  writeFileSync(cfgPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  chmodSync(cfgPath, 0o600);

  if (reg.reused_machine_id) {
    console.log("✓ registered (reused existing machine_id; token rotated)");
  } else {
    console.log("✓ registered with mneme server (fresh machine_id)");
  }
  console.log(`  server:  ${config.server.url}`);
  console.log(`  machine: ${reg.machine_name} (${reg.machine_id})`);
  console.log(`  token:   ${reg.token.slice(0, 22)}…`);
  if (!fingerprint) {
    console.log(
      "  fingerprint: none (re-installs on this platform create new rows)",
    );
  }
  console.log("✓ wrote ~/.mneme/config.json (mode 600)");

  // Daemon install. Plugin root is the parent of this script's
  // directory: slash.ts lives at <pluginRoot>/scripts/slash.ts, so
  // pluginRoot = dirname(dirname(script-path)). We derive it from
  // import.meta.url instead of process.env.CLAUDE_PLUGIN_ROOT because
  // Claude Code's slash command machinery substitutes
  // ${CLAUDE_PLUGIN_ROOT} into the command string but does NOT set
  // it as an environment variable for the spawned process — so
  // reading the env was making the whole install path skip silently.
  const pluginRoot =
    process.env.CLAUDE_PLUGIN_ROOT ??
    dirname(dirname(fileURLToPath(import.meta.url)));
  if (pluginRoot) {
    const installResult = await installDaemonService({
      pluginRoot,
      daemonPort,
      bunPath: process.execPath,
    });
    if (installResult.ok) {
      console.log(
        `✓ daemon service installed (${installResult.platform}, ${installResult.servicePath})`,
      );
      console.log(
        `  daemon listening on 127.0.0.1:${installResult.port}; bge model auto-downloads on first run (~5 min)`,
      );
    } else {
      console.warn(`⚠ daemon install incomplete: ${installResult.error}`);
      console.warn(
        "  config.json written without daemon block; hook posts directly to server (existing path).",
      );
      console.warn("  re-run /mneme:install-daemon to retry once the issue is resolved.");
    }
  } else {
    console.warn(
      "⚠ CLAUDE_PLUGIN_ROOT not set; skipping daemon install (run /mneme:install-daemon manually)",
    );
  }

  console.log("\n  next step: /reload-plugins");
}

type MachineRow = {
  id: string;
  name: string;
  machine_id: string | null;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

/** List registered machines. Admin password read from stdin to keep it off argv. */
async function machines(): Promise<void> {
  const adminPassword = await readStdin();
  if (!adminPassword) throw new Error("admin password required on stdin");
  const cfg = loadConfig();
  const resp = await fetch(serverUrl(cfg, "/api/auth/machines"), {
    headers: { Authorization: `Bearer ${adminPassword}` },
  });
  if (!resp.ok) {
    throw new Error(
      `GET /api/auth/machines failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`,
    );
  }
  const { machines: rows } = (await resp.json()) as { machines: MachineRow[] };
  if (!rows.length) {
    console.log("(no machines registered)");
    return;
  }
  for (const r of rows) {
    const status = r.revoked_at ? `revoked ${r.revoked_at.slice(0, 10)}` : "active";
    const lastUsed = r.last_used_at ? r.last_used_at.replace("T", " ").slice(0, 16) : "never";
    console.log(
      `${r.machine_id ?? "-"}  ${r.name.padEnd(20)}  ${status.padEnd(20)}  last used ${lastUsed}`,
    );
  }
}

/** Rename THIS machine in place. New name on argv. No admin password —
 *  the per-machine bearer in ~/.mneme/config.json is the identity, and the
 *  server stamps the rename target from ctx.auth.machineId. Same machine_id,
 *  same token, same captures/memories; only the label changes server-side
 *  and locally. Renaming another machine isn't supported by design (would
 *  leave that machine's local config stale). */
async function rename(machineName: string): Promise<void> {
  if (!machineName) throw new Error("new machine name required");
  const cfg = loadConfig();
  const resp = await fetch(serverUrl(cfg, "/api/auth/rename"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.auth.key}`,
    },
    body: JSON.stringify({ machine_name: machineName }),
  });
  if (!resp.ok) {
    throw new Error(
      `POST /api/auth/rename failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`,
    );
  }
  const r = (await resp.json()) as {
    machine_id: string;
    machine_name: string;
    renamed: number;
  };
  console.log(`✓ renamed this machine → "${r.machine_name}" (${r.machine_id})`);

  // Local sync. Nothing in the runtime reads machine.name from config (hooks
  // send machine_id + os.hostname), but a stale label is confusing for humans
  // inspecting ~/.mneme/config.json.
  cfg.machine.name = r.machine_name;
  saveConfig(cfg);
  console.log(`✓ synced ~/.mneme/config.json (machine.name = "${r.machine_name}")`);
}

/** Revoke a machine. machine_id on argv; admin password on stdin. */
async function revoke(machineId: string): Promise<void> {
  if (!machineId) throw new Error("machine_id required");
  const adminPassword = await readStdin();
  if (!adminPassword) throw new Error("admin password required on stdin");
  const cfg = loadConfig();
  const resp = await fetch(serverUrl(cfg, "/api/auth/revoke"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminPassword}`,
    },
    body: JSON.stringify({ machine_id: machineId }),
  });
  if (!resp.ok) {
    throw new Error(
      `POST /api/auth/revoke failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`,
    );
  }
  const r = (await resp.json()) as { machine_id: string; revoked: number };
  console.log(`✓ revoked ${r.revoked} key(s) for machine ${r.machine_id}`);
}

/** Setup args: accept both positional (url, password, [name]) and --flag forms.
 *  Mixed is fine — flags win where both are present. */
function parseSetupArgs(args: string[]): {
  url: string;
  adminPassword: string;
  name?: string;
} {
  const { values, positionals } = parseArgs({
    args,
    options: {
      "server-url": { type: "string" },
      "admin-password": { type: "string" },
      name: { type: "string" },
    },
    allowPositionals: true,
    strict: false,
  });
  return {
    url: (values["server-url"] as string | undefined) ?? positionals[0] ?? "",
    adminPassword:
      (values["admin-password"] as string | undefined) ?? positionals[1] ?? "",
    name: (values.name as string | undefined) ?? positionals[2],
  };
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  switch (cmd) {
    case "setup": {
      const { url, adminPassword, name } = parseSetupArgs(
        process.argv.slice(3),
      );
      await setup(url, adminPassword, name);
      return;
    }
    case "memory":
      await memory();
      return;
    case "pin":
      await pin(process.argv[3] ?? "");
      return;
    case "unpin":
      await unpin(process.argv[3] ?? "");
      return;
    case "machines":
      await machines();
      return;
    case "revoke":
      await revoke(process.argv[3] ?? "");
      return;
    case "rename":
      await rename(process.argv[3] ?? "");
      return;
    default:
      console.error(`unknown subcommand: ${cmd}`);
      console.error(
        "usage: slash.ts <setup|memory|pin|unpin|machines|revoke|rename> [args]",
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
