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
import { join } from "node:path";
import { type MnemeConfig, loadConfig, serverUrl } from "./config.ts";
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

async function pin(id: string, value: boolean): Promise<void> {
  const verb = value ? "pin" : "unpin";
  if (!id) throw new Error(`${verb} requires a memory id`);
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!isUuid.test(id)) {
    throw new Error(
      `${verb} requires a valid memory uuid (got: "${id}"). Use mneme.sql to find the id first.`,
    );
  }
  const cfg = loadConfig();
  const r = await postCapture(cfg, {
    ...baseScope(cfg),
    source: "manual",
    content: `${value ? "pin" : "unpin"} ${id}`,
    raw_meta: { kind: "pin", target: id, value },
  });
  console.log(
    `✓ ${value ? "pinned" : "unpinned"} memory ${id} (request id ${r.id})`,
  );
}

async function setup(
  url: string,
  key: string,
  name?: string,
): Promise<void> {
  if (!url) throw new Error("server-url required");
  if (!key) throw new Error("api-key required");

  const cfgDir = join(homedir(), ".mneme");
  const cfgPath = join(cfgDir, "config.json");

  // Read existing config if present so we preserve machine.id across runs.
  let existing: Partial<MnemeConfig> = {};
  if (existsSync(cfgPath)) {
    try {
      existing = JSON.parse(readFileSync(cfgPath, "utf8")) as Partial<MnemeConfig>;
    } catch {
      // If existing is corrupt, overwrite with a fresh config.
    }
  }

  const machineId = existing.machine?.id ?? crypto.randomUUID();
  const machineName =
    name ??
    existing.machine?.name ??
    hostname().toLowerCase().split(".")[0] ??
    "unknown";

  const config: MnemeConfig = {
    server: { url: url.replace(/\/$/, "") },
    auth: { key },
    machine: { id: machineId, name: machineName },
    ...(existing.projects ? { projects: existing.projects } : {}),
  };

  if (!existsSync(cfgDir)) mkdirSync(cfgDir, { recursive: true });
  writeFileSync(cfgPath, `${JSON.stringify(config, null, 2)}\n`);
  chmodSync(cfgPath, 0o600);

  console.log("✓ wrote ~/.mneme/config.json (mode 600)");
  console.log(`  server:  ${config.server.url}`);
  console.log(`  machine: ${machineName} (${machineId})`);
  console.log(`  key:     ${key.slice(0, 22)}…`);
  console.log("\n  next step: /reload-plugins");
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  switch (cmd) {
    case "setup":
      await setup(
        process.argv[3] ?? "",
        process.argv[4] ?? "",
        process.argv[5],
      );
      return;
    case "memory":
      await memory();
      return;
    case "pin":
      await pin(process.argv[3] ?? "", true);
      return;
    case "unpin":
      await pin(process.argv[3] ?? "", false);
      return;
    default:
      console.error(`unknown subcommand: ${cmd}`);
      console.error("usage: slash.ts <setup|memory|pin|unpin> [args]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
