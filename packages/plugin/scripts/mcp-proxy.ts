#!/usr/bin/env bun
// Local stdio MCP server that proxies every JSON-RPC request to the
// remote /mcp endpoint over HTTP. Reads ~/.mneme/config.json once at
// startup for the server URL and Bearer key.
//
// MCP stdio convention: newline-delimited JSON-RPC. Each request is one
// line, each response is one line. Notifications (no id) get no
// response. We forward bytes faithfully to /mcp.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

type ConfigShape = {
  server: { url: string };
  auth: { key: string };
  machine?: { id?: string; name?: string };
};

function err(id: unknown, code: number, message: string): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  });
}

let cfg: ConfigShape | undefined;
let cfgError: string | undefined;
const cfgPath = join(homedir(), ".mneme", "config.json");
try {
  cfg = JSON.parse(readFileSync(cfgPath, "utf8")) as ConfigShape;
  if (!cfg.server?.url || !cfg.auth?.key) {
    throw new Error("config missing server.url or auth.key");
  }
} catch (e) {
  cfgError = e instanceof Error ? e.message : String(e);
  process.stderr.write(`mneme-mcp: config load failed (${cfgPath}): ${cfgError}\n`);
}

const url = cfg ? `${cfg.server.url.replace(/\/$/, "")}/mcp` : "";
const key = cfg?.auth.key ?? "";

process.stderr.write(
  `mneme-mcp: proxy ready (server=${cfg?.server.url ?? "<unconfigured>"})\n`,
);

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

for await (const rawLine of rl) {
  const line = rawLine.trim();
  if (!line) continue;

  let req: { id?: unknown; method?: string };
  try {
    req = JSON.parse(line);
  } catch {
    process.stdout.write(err(null, -32700, "parse error") + "\n");
    continue;
  }

  if (!cfg) {
    if (req.id !== undefined) {
      process.stdout.write(
        err(
          req.id,
          -32603,
          `mneme proxy not configured (${cfgError ?? "missing config"})`,
        ) + "\n",
      );
    }
    continue;
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Mneme-Source": "mcp",
      },
      body: line,
    });
    if (resp.status === 204) continue; // notification — no response expected

    const text = await resp.text();
    if (resp.status >= 400 && req.id !== undefined) {
      // Translate HTTP-level errors (auth, server fault) into JSON-RPC errors
      // so the harness shows a clean message instead of dropping the call.
      let detail = text;
      try {
        const j = JSON.parse(text);
        detail = typeof j.error === "string" ? j.error : JSON.stringify(j);
      } catch {
        // keep raw text
      }
      process.stdout.write(
        err(req.id, -32603, `mneme upstream ${resp.status}: ${detail}`) + "\n",
      );
      continue;
    }
    process.stdout.write(text + "\n");
  } catch (e) {
    if (req.id !== undefined) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stdout.write(
        err(req.id, -32603, `mneme upstream error: ${msg}`) + "\n",
      );
    }
  }
}
