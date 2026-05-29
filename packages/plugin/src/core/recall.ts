// Shared Mneme recall core: embed('text') substitution via the local
// daemon and JSON-RPC forwarding to the server's /mcp. Both harness edges
// use this so the recall path has a single source of truth:
//   - Claude Code: src/claude/mcp-proxy.ts (stdio MCP server)
//   - Pi:          src/pi/register.ts (native tool)

import { type MnemeConfig, serverUrl } from "./config.ts";
import { plog as sharedPlog } from "./log.ts";
import { scrubData } from "./scrub.ts";

// embed('text') macro. The substituter resolves each to a vector literal
// via the daemon's bge-small subprocess before the SQL leaves the machine;
// the server has no embedder.
const EMBED_RE = /\bembed\(\s*'((?:[^'\\]|\\.)*)'\s*\)/gi;

function log(msg: string, fields?: Record<string, unknown>): void {
  sharedPlog("INFO", "mcp.proxy", msg, fields);
}

export type SubstitutionResult =
  | { kind: "noop"; sql: string } // no embed() macro present, forward sql as-is
  | { kind: "ok"; sql: string } // embed() macros replaced with vector literals
  | { kind: "error"; message: string }; // embed() present but couldn't substitute

export async function substituteEmbedsViaDaemon(
  cfg: MnemeConfig,
  sql: string,
): Promise<SubstitutionResult> {
  const matches = Array.from(sql.matchAll(EMBED_RE));
  if (matches.length === 0) return { kind: "noop", sql };

  if (!cfg.daemon) {
    return {
      kind: "error",
      message:
        "embed() requires the per-machine mneme daemon to substitute it before SQL is sent. " +
        "No daemon block in ~/.mneme/config.json — run /mneme:setup to register this machine.",
    };
  }

  const rawTexts = Array.from(new Set(matches.map((m) => m[1]!.replace(/\\'/g, "'"))));
  const cleanedTexts = rawTexts.map((t) => scrubData(t) as string);
  log(`substituteEmbeds: calling daemon with ${cleanedTexts.length} text(s)`);

  let vectors: number[][];
  try {
    const resp = await fetch(`http://127.0.0.1:${cfg.daemon.port}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: cleanedTexts, source: "mcp:sql" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      const detail = (await resp.text().catch(() => "")).slice(0, 200);
      return {
        kind: "error",
        message: `embed() substitution failed: daemon /embed returned ${resp.status}${detail ? `: ${detail}` : ""}. Check /mneme:status.`,
      };
    }
    const body = (await resp.json()) as { vectors?: number[][] };
    if (!Array.isArray(body.vectors) || body.vectors.length !== cleanedTexts.length) {
      return {
        kind: "error",
        message: `embed() substitution failed: daemon returned ${body.vectors?.length ?? "no"} vectors for ${cleanedTexts.length} text(s).`,
      };
    }
    vectors = body.vectors;
    log(`substituteEmbeds: daemon returned ${vectors.length} vector(s), substituting`);
  } catch (e) {
    return {
      kind: "error",
      message: `embed() substitution failed: daemon unreachable (${e instanceof Error ? e.message : String(e)}). Is the daemon running? /mneme:status.`,
    };
  }

  const embedMap = new Map(rawTexts.map((t, i) => [t, vectors[i]!]));
  const rewritten = sql.replace(EMBED_RE, (_match, raw: string) => {
    const text = raw.replace(/\\'/g, "'");
    const vec = embedMap.get(text);
    if (!vec) return _match;
    return `'[${vec.join(",")}]'::vector`;
  });
  return { kind: "ok", sql: rewritten };
}

// Run one read-only mneme_sql query end-to-end: substitute embed() macros
// locally, then forward a tools/call JSON-RPC to the server's /mcp. Returns
// the text payload the server sends back (JSON rows). Throws on a
// substitution failure or an upstream error — callers surface the message.
export async function callMnemeSql(cfg: MnemeConfig, query: string): Promise<string> {
  const sub = await substituteEmbedsViaDaemon(cfg, query);
  if (sub.kind === "error") throw new Error(sub.message);

  const rpc = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "mneme_sql", arguments: { query: sub.sql } },
  };

  const resp = await fetch(serverUrl(cfg, "/mcp"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.auth.key}`,
      "X-Mneme-Source": "mcp",
    },
    body: JSON.stringify(rpc),
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`mneme upstream ${resp.status}: ${text.slice(0, 300)}`);

  let parsed: { error?: { message?: string }; result?: { content?: { text?: string }[] } };
  try {
    parsed = JSON.parse(text);
  } catch {
    return text; // not JSON — hand back verbatim
  }
  if (parsed.error) throw new Error(parsed.error.message ?? JSON.stringify(parsed.error));

  const content = parsed.result?.content;
  if (Array.isArray(content)) return content.map((c) => c?.text ?? "").join("\n");
  return JSON.stringify(parsed.result ?? parsed);
}
