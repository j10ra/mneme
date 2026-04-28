#!/usr/bin/env bun
// Local stdio MCP server that proxies every JSON-RPC request to the
// remote /mcp endpoint over HTTP. Reads ~/.mneme/config.json once at
// startup for the server URL and Bearer key.
//
// MCP stdio convention: newline-delimited JSON-RPC. Each request is one
// line, each response is one line. Notifications (no id) get no
// response. We forward bytes faithfully to /mcp.

import { createInterface } from "node:readline";
import { type MnemeConfig, configPath, loadConfig, serverUrl } from "./config.ts";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "mneme";
const SERVER_VERSION = "1.0.0";

const TOOL_DEF = {
  name: "mneme.sql",
  description:
    "Execute a read-only SELECT against Mneme's Postgres. " +
    "Use embed('text') macro for semantic search (substituted with a voyage-code-3 vector before execution). " +
    "Combine with `<=>` for cosine distance and `ts_rank(tsv, websearch_to_tsquery(...))` for keyword. " +
    "Auto-LIMIT 200 if absent. 5s timeout, 1MB result cap. " +
    "See the using-mneme skill for the schema and query templates.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "SQL SELECT statement" },
    },
    required: ["query"],
  },
};

function ok(id: unknown, result: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", id: id ?? null, result });
}

function err(id: unknown, code: number, message: string): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  });
}

let cfg: MnemeConfig | undefined;
let cfgError: string | undefined;
try {
  cfg = loadConfig();
} catch (e) {
  cfgError = e instanceof Error ? e.message : String(e);
  process.stderr.write(
    `mneme-mcp: config load failed (${configPath()}): ${cfgError}\n`,
  );
}

const url = cfg ? serverUrl(cfg, "/mcp") : "";
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

  // Handshake methods are answered locally so the MCP attaches even when
  // the upstream server is unreachable. Only tools/call (and anything
  // that genuinely needs server state) is forwarded.
  if (req.method === "initialize") {
    process.stdout.write(
      ok(req.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      }) + "\n",
    );
    continue;
  }
  if (req.method === "notifications/initialized") {
    // Notification: no response.
    continue;
  }
  if (req.method === "ping") {
    process.stdout.write(ok(req.id, {}) + "\n");
    continue;
  }
  if (req.method === "tools/list") {
    process.stdout.write(ok(req.id, { tools: [TOOL_DEF] }) + "\n");
    continue;
  }

  if (!cfg) {
    if (req.id !== undefined) {
      process.stdout.write(
        err(
          req.id,
          -32603,
          `mneme proxy not configured (${cfgError ?? "missing config"}). Run /setup to configure.`,
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
