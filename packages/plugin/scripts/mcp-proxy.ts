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
import { scrubData } from "./scrub.ts";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "mneme";
const SERVER_VERSION = "1.0.0";

// Match server-side substituteEmbeds. The proxy now does the same
// substitution locally by calling the daemon's /embed endpoint, so the
// server's /mcp becomes a pure SQL executor for daemon-equipped
// machines. Server-side embed() handling remains as a fallback for
// machines without a running daemon (transition period).
const EMBED_RE = /\bembed\(\s*'((?:[^'\\]|\\.)*)'\s*\)/gi;

function plog(msg: string): void {
  // stdout is reserved for JSON-RPC; diagnostics go to stderr.
  process.stderr.write(`mneme-mcp: ${msg}\n`);
}

async function substituteEmbedsViaDaemon(
  cfg: MnemeConfig,
  sql: string,
): Promise<string | null> {
  if (!cfg.daemon) {
    plog("substituteEmbeds: no cfg.daemon, forwarding to server");
    return null;
  }
  const matches = Array.from(sql.matchAll(EMBED_RE));
  if (matches.length === 0) {
    return sql; // no embed() in this SQL; nothing to do, but signal "ok, use this sql as-is"
  }

  const rawTexts = Array.from(
    new Set(matches.map((m) => m[1]!.replace(/\\'/g, "'"))),
  );
  const cleanedTexts = rawTexts.map((t) => scrubData(t) as string);
  plog(
    `substituteEmbeds: calling daemon with ${cleanedTexts.length} text(s)`,
  );

  let vectors: number[][];
  try {
    const resp = await fetch(`http://127.0.0.1:${cfg.daemon.port}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: cleanedTexts }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      plog(`substituteEmbeds: daemon returned ${resp.status}, falling back to server`);
      return null;
    }
    const body = (await resp.json()) as { vectors?: number[][] };
    if (!Array.isArray(body.vectors) || body.vectors.length !== cleanedTexts.length) {
      plog(
        `substituteEmbeds: daemon returned ${body.vectors?.length ?? "no"} vectors for ${cleanedTexts.length} texts, falling back`,
      );
      return null;
    }
    vectors = body.vectors;
    plog(
      `substituteEmbeds: daemon returned ${vectors.length} vector(s), substituting`,
    );
  } catch (err) {
    plog(
      `substituteEmbeds: daemon unreachable (${err instanceof Error ? err.message : String(err)}), falling back to server`,
    );
    return null;
  }

  const embedMap = new Map(rawTexts.map((t, i) => [t, vectors[i]!]));
  return sql.replace(EMBED_RE, (_match, raw: string) => {
    const text = raw.replace(/\\'/g, "'");
    const vec = embedMap.get(text);
    if (!vec) return _match;
    return `'[${vec.join(",")}]'::vector`;
  });
}

const TOOL_DEF = {
  name: "mneme.sql",
  description:
    "Execute a read-only SELECT against Mneme's Postgres. " +
    "Use embed('text') macro for semantic search (substituted with a 1024-dim vector before execution). " +
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

  // For mneme.sql tool calls, attempt local embed substitution via the
  // daemon. On success, send the rewritten SQL with vector literals
  // already substituted; the server's /mcp becomes a pure SQL executor.
  // On any failure (no daemon block, daemon unreachable, embed error),
  // fall through to forwarding the original request — the server's
  // mcp.ts still has its own embed() substitution as backup.
  let bodyToForward = line;
  if (
    cfg &&
    cfg.daemon &&
    typeof (req as { method?: unknown }).method === "string" &&
    (req as { method: string }).method === "tools/call"
  ) {
    const params = (req as { params?: unknown }).params as
      | { name?: unknown; arguments?: { query?: unknown } }
      | undefined;
    const sql =
      params && params.name === "mneme.sql" && typeof params.arguments?.query === "string"
        ? (params.arguments.query as string)
        : null;
    if (sql) {
      const hadEmbed = /\bembed\(/i.test(sql);
      plog(`tools/call: mneme.sql ${hadEmbed ? "(has embed())" : "(no embed())"}`);
      const rewritten = await substituteEmbedsViaDaemon(cfg, sql);
      if (rewritten !== null && rewritten !== sql && params) {
        const rewrittenReq = {
          ...(req as Record<string, unknown>),
          params: {
            ...((req as { params?: Record<string, unknown> }).params ?? {}),
            arguments: {
              ...((params.arguments as Record<string, unknown>) ?? {}),
              query: rewritten,
            },
          },
        };
        bodyToForward = JSON.stringify(rewrittenReq);
        plog("tools/call: forwarding sanitized SQL with vector literals");
      } else if (hadEmbed) {
        plog("tools/call: embed() present but not substituted, server will handle");
      }
    }
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Mneme-Source": "mcp",
      },
      body: bodyToForward,
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
