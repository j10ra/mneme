#!/usr/bin/env bun
// Slash command dispatcher: /memory, /pin, /unpin.
// /recall and /summarise are agent-driven (use mneme.sql via MCP), no
// shell-out needed for those.

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
  if (!id) throw new Error(`${value ? "pin" : "unpin"} requires a memory id`);
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

async function main(): Promise<void> {
  const cmd = process.argv[2];
  switch (cmd) {
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
      console.error("usage: slash.ts <memory|pin|unpin> [id]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
