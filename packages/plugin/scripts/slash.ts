#!/usr/bin/env bun
// Slash command dispatcher: /memory, /pin, /unpin, /handoff, etc.
// /recall and /resume are agent-driven (use mneme.sql via MCP), no
// shell-out needed for those.

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir, hostname } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  type MnemeConfig,
  loadConfig,
  machineFingerprint,
  saveConfig,
  serverUrl,
} from "./config.ts";
import { decryptAdminPassword, encryptAdminPassword } from "./admin-secret.ts";
import { installDaemonService, pickFreePortDeterministic } from "./daemon-install.ts";
import { EMBEDDER_MODEL, embedViaDaemon } from "./embedder.ts";
import { plog } from "./log.ts";
import { baseScope } from "./scope.ts";

async function readStdin(): Promise<string> {
  let buf = "";
  for await (const chunk of process.stdin as AsyncIterable<Buffer | string>) {
    buf += typeof chunk === "string" ? chunk : chunk.toString("utf8");
  }
  return buf.trim();
}

/** Resolution ladder for the admin password used by machines / revoke /
 *  status. Order:
 *    1. MNEME_ADMIN_PASSWORD env var (covers shell-rc and one-shot
 *       overrides without touching disk).
 *    2. cfg.admin.secret — written to ~/.mneme/config.json (mode 600)
 *       at /mneme:setup time, encrypted with a key derived from this
 *       machine's hardware fingerprint (see admin-secret.ts). Fails
 *       open: a fingerprint change or corrupt blob falls through to
 *       stdin instead of erroring out.
 *    3. stdin (legacy interactive flow; still works on machines that
 *       didn't store the password).
 *  Returns null only if all three rungs are empty. */
async function resolveAdminPassword(cfg: MnemeConfig): Promise<string | null> {
  const fromEnv = process.env.MNEME_ADMIN_PASSWORD;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
  if (cfg.admin?.secret) {
    const decrypted = decryptAdminPassword(cfg.admin.secret);
    if (decrypted) return decrypted;
    process.stderr.write(
      "mneme: admin secret decrypt failed (fingerprint changed?), falling back to stdin\n",
    );
  }
  if (process.stdin.isTTY) return null;
  const fromStdin = await readStdin();
  return fromStdin || null;
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MemoryResult = { id: string; created: boolean; pinned: boolean };

async function postMemory(cfg: MnemeConfig, body: Record<string, unknown>): Promise<MemoryResult> {
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
    throw new Error(`POST /api/memory failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`);
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
  console.log(`✓ memory captured (id ${r.id}${r.deduped ? ", deduped" : ""})`);
}

/** Slug rules:
 *  - kebab-case, lowercase ASCII letters + digits + hyphens
 *  - 2-6 segments, 4-60 chars total
 *  - no leading/trailing hyphen, no double hyphen
 *  Used by /handoff and the compact auto-capture path. The receiver
 *  (/resume <slug>) does an exact match on meta.handoff_slug. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+){1,5}$/;
const MAX_SLUG_LEN = 60;

function validateSlug(slug: string): string {
  const cleaned = slug.trim().toLowerCase();
  if (cleaned.length === 0) throw new Error("handoff slug required");
  if (cleaned.length > MAX_SLUG_LEN) {
    throw new Error(`handoff slug too long (${cleaned.length} > ${MAX_SLUG_LEN})`);
  }
  if (!SLUG_RE.test(cleaned)) {
    throw new Error(
      `invalid handoff slug "${cleaned}". Use kebab-case, 2-6 lowercase segments (e.g. "dream-streaming", "config-audit-2026-05-23").`,
    );
  }
  return cleaned;
}

/** Handoff: synthesise side. Agent supplies the slug as arg, the prose
 *  on stdin. Writes a kind=summary memory with meta.handoff_slug so the
 *  receiver (/resume <slug>) can pick it up across machines. */
async function handoff(slugArg: string): Promise<void> {
  const slug = validateSlug(slugArg);
  const text = await readStdin();
  if (!text) throw new Error("no handoff text on stdin");
  const cfg = loadConfig();
  // Embed via local daemon so the handoff is semantically searchable
  // immediately. Soft-fails to embedding=NULL if the daemon is down —
  // row still writes; recall via mneme_sql embed() will miss it until
  // re-embed, but slug lookup via /mneme:resume still works.
  const embedding = cfg.daemon
    ? await embedViaDaemon(cfg.daemon.port, text, "slash:handoff")
    : null;
  const r = await postMemory(cfg, {
    ...baseScope(cfg),
    content: text,
    kind: "summary",
    importance: 0.7,
    embedding_model: EMBEDDER_MODEL,
    ...(embedding ? { embedding } : {}),
    handoff_slug: slug,
  });
  const shortId = r.id.slice(0, 8);
  console.log(
    `✓ ${r.created ? "handoff saved" : "handoff updated"} as \`${slug}\` (id ${shortId})`,
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

  // Embed via local daemon so the pinned memory is semantically
  // searchable immediately. Soft-fails to embedding=NULL if the daemon
  // is down — row still writes and pin still surfaces, just absent from
  // semantic recall until re-embed.
  const embedding = cfg.daemon ? await embedViaDaemon(cfg.daemon.port, input, "slash:pin") : null;
  const r = await postMemory(cfg, {
    ...baseScope(cfg),
    content: input,
    kind: "note",
    importance: 1.0,
    pinned: true,
    embedding_model: EMBEDDER_MODEL,
    ...(embedding ? { embedding } : {}),
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

/** Archive: stamp archived_at on the target memory via the same
 *  raw_meta actuation channel pin/unpin use. value=true archives;
 *  value=false unarchives. Captures are immutable — only memories
 *  get the flag flip. */
async function archive(input: string, value = true): Promise<void> {
  if (!input) throw new Error("archive requires a memory id");
  if (!UUID_RE.test(input)) {
    throw new Error(
      `archive requires a memory uuid (got: "${input}"). Use mneme.sql to find the id first, then archive by uuid.`,
    );
  }
  const cfg = loadConfig();
  const verb = value ? "archive" : "unarchive";
  const r = await postCapture(cfg, {
    ...baseScope(cfg),
    source: "manual",
    content: `${verb} ${input}`,
    raw_meta: { kind: "archive", target: input, value },
  });
  console.log(`✓ ${verb}d memory ${input} (request id ${r.id})`);
}

/** Supersede: mark `oldId` as superseded by `newId` via the raw_meta
 *  actuation channel. value=false (via unsupersede) clears the flag. */
async function supersede(oldId: string, newId: string, value = true): Promise<void> {
  if (!oldId) throw new Error("supersede requires the superseded memory id");
  if (!UUID_RE.test(oldId)) {
    throw new Error(
      `supersede requires a memory uuid for the old id (got: "${oldId}"). Resolve it with mneme.sql first.`,
    );
  }
  if (value) {
    if (!newId) throw new Error("supersede requires the replacement memory id");
    if (!UUID_RE.test(newId)) {
      throw new Error(
        `supersede requires a memory uuid for the new id (got: "${newId}"). Resolve it with mneme.sql first.`,
      );
    }
  }
  const cfg = loadConfig();
  const raw_meta = value
    ? { kind: "supersede", target: oldId, new_id: newId, value: true }
    : { kind: "supersede", target: oldId, value: false };
  const content = value ? `supersede ${oldId} by ${newId}` : `unsupersede ${oldId}`;
  const r = await postCapture(cfg, { ...baseScope(cfg), source: "manual", content, raw_meta });
  console.log(
    value
      ? `✓ superseded ${oldId} by ${newId} (request id ${r.id})`
      : `✓ unsuperseded ${oldId} (request id ${r.id})`,
  );
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
async function setup(url: string, adminPassword: string, name?: string): Promise<void> {
  if (!url) throw new Error("server-url required");
  if (!adminPassword) throw new Error("admin-password required");

  const baseUrl = url.replace(/\/$/, "");
  const machineName = name ?? hostname().toLowerCase().split(".")[0] ?? "unknown";

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

  // Write the daemon block up-front because installDaemonService below
  // loads the plist immediately (RunAtLoad=true) which races with the
  // write. The hook is daemon-only (no server fallback), so a leftover
  // daemon block from a failed install is harmless: the daemon writes
  // captures into outbox/capture/captured/ on disk and the next
  // successful daemon launch picks them up.
  // Encrypt the admin password with a key derived from this machine's
  // hardware fingerprint so the slash commands that need admin scope
  // (status / machines / revoke) don't have to re-prompt every call.
  // Failure here is non-fatal: setup still works, the operator just
  // keeps typing the password each time. Most likely cause is a
  // platform that machineFingerprint() doesn't support.
  let adminBlock: { secret: string } | undefined;
  try {
    adminBlock = { secret: encryptAdminPassword(adminPassword) };
  } catch (e) {
    process.stderr.write(
      `mneme: skipping admin secret persist (${e instanceof Error ? e.message : e})\n`,
    );
  }

  const config: MnemeConfig = {
    server: { url: baseUrl },
    auth: { key: reg.token },
    machine: { id: reg.machine_id, name: reg.machine_name },
    daemon: {
      port: daemonPort,
      agent_provider: existing.daemon?.agent_provider ?? "claude",
    },
    ...(adminBlock ? { admin: adminBlock } : {}),
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
    console.log("  fingerprint: none (re-installs on this platform create new rows)");
  }
  console.log("✓ wrote ~/.mneme/config.json (mode 600)");
  if (adminBlock) {
    console.log("  admin:   stored encrypted (AES-GCM, machine-fingerprint-derived key)");
  }

  // Daemon install. Plugin root is the parent of this script's
  // directory: slash.ts lives at <pluginRoot>/scripts/slash.ts, so
  // pluginRoot = dirname(dirname(script-path)). We derive it from
  // import.meta.url instead of process.env.CLAUDE_PLUGIN_ROOT because
  // Claude Code's slash command machinery substitutes
  // ${CLAUDE_PLUGIN_ROOT} into the command string but does NOT set
  // it as an environment variable for the spawned process — so
  // reading the env was making the whole install path skip silently.
  const pluginRoot =
    process.env.CLAUDE_PLUGIN_ROOT ?? dirname(dirname(fileURLToPath(import.meta.url)));
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

/** Help: walk the plugin's commands/ directory, parse each file's
 *  YAML frontmatter, and render a single markdown table.
 *
 *  Single source of truth: each commands/*.md owns its own metadata
 *  (description + scope), so adding a new slash auto-updates help on
 *  the next render — nothing to keep in sync manually.
 *
 *  Frontmatter schema (loose, only these three keys are surfaced):
 *    description: <one-line>
 *    argument-hint: <optional usage hint>     (omit for no-args slashes)
 *    scope: <admin|user>                       (defaults to "user")
 *
 *  Plugin root resolves the same way setup() does — via
 *  CLAUDE_PLUGIN_ROOT env var when CC sets it, falling back to
 *  derivation from this script's own path. */
type SlashEntry = {
  name: string;
  description: string;
  argHint: string;
  scope: string;
};

function pluginRoot(): string {
  return process.env.CLAUDE_PLUGIN_ROOT ?? dirname(dirname(fileURLToPath(import.meta.url)));
}

function parseFrontmatter(raw: string): Record<string, string> {
  // Minimal YAML frontmatter parser — only handles the leading `---`
  // block with `key: value` pairs (no nested objects, no lists). Good
  // enough for the metadata our slashes carry. Any value past the first
  // `:` becomes the string, trimmed.
  if (!raw.startsWith("---")) return {};
  const close = raw.indexOf("\n---", 4);
  if (close === -1) return {};
  const body = raw.slice(4, close);
  const out: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

async function help(): Promise<void> {
  const root = pluginRoot();
  const dir = join(root, "commands");
  if (!existsSync(dir)) {
    throw new Error(`commands directory not found: ${dir}`);
  }
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const entries: SlashEntry[] = [];
  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf8");
    const fm = parseFrontmatter(raw);
    const name = basename(file, ".md");
    entries.push({
      name,
      description: fm.description ?? "(no description)",
      argHint: fm["argument-hint"] ?? "",
      scope: fm.scope ?? "user",
    });
  }

  // Group by scope so the table reads as "user-facing first, then ops".
  const byScope = (s: string) => entries.filter((e) => e.scope === s);
  const groups: Array<{ label: string; rows: SlashEntry[] }> = [
    { label: "User", rows: byScope("user") },
    { label: "Admin", rows: byScope("admin") },
  ];
  // Catch any custom scope so future additions surface even without
  // updating this groupings list.
  const handled = new Set(["user", "admin"]);
  const other = entries.filter((e) => !handled.has(e.scope));
  if (other.length > 0) groups.push({ label: "Other", rows: other });

  console.log("# Mneme slash commands");
  console.log("");
  for (const g of groups) {
    if (g.rows.length === 0) continue;
    console.log(`## ${g.label}`);
    console.log("");
    console.log("| command | what it does | usage |");
    console.log("|---|---|---|");
    for (const e of g.rows) {
      const usage = e.argHint ? `\`/mneme:${e.name} ${e.argHint}\`` : `\`/mneme:${e.name}\``;
      console.log(`| \`/mneme:${e.name}\` | ${e.description} | ${usage} |`);
    }
    console.log("");
  }
  console.log(
    "Tip: every slash (except `/mneme:setup` on a fresh machine) reads `~/.mneme/config.json` for the per-machine token.",
  );
}

/** Dashboard: print the local daemon URL and (best-effort) open it in
 *  the system browser. Read-only convenience — no auth, no admin
 *  password. The daemon binds to 127.0.0.1 only so the URL is local. */
async function dashboard(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.daemon?.port) {
    throw new Error("no daemon configured (run /mneme:setup first)");
  }
  const url = `http://127.0.0.1:${cfg.daemon.port}/dashboard`;
  console.log(url);

  // Best-effort browser open. Silent failure is fine — the URL is
  // already printed for the user to copy if their environment doesn't
  // have a browser launcher (SSH, headless, etc).
  const openCmd =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];

  try {
    const proc = Bun.spawn(openCmd, {
      stdout: "ignore",
      stderr: "ignore",
    });
    // Don't await — fire-and-forget; the spawn returning means the
    // launcher accepted the URL even if the browser is still starting.
    proc.unref();
  } catch {
    // No browser launcher on PATH. URL is already printed.
  }
}

type StatusResponse = {
  generated_at: string;
  workers: Array<{
    name: string;
    schedule_ms: number;
    last_run_at: string | null;
    last_status: "ok" | "failed" | null;
    last_error: string | null;
    last_duration_ms: number | null;
    next_run_at: string;
    overdue_ms: number;
    since_last_run_ms: number | null;
  }>;
  daemons: Array<{
    machine_id: string;
    machine_name: string | null;
    outbox_pending: number;
    outbox_extracted: number;
    outbox_embedded: number;
    outbox_failed: number;
    last_processed_at: string | null;
    posted_at: string;
    stale: boolean;
    since_posted_ms: number;
  }>;
  dream: {
    last_window_at: string | null;
    last_cluster_count: number | null;
    in_flight: number;
    stuck: number;
    stuck_after_ms: number;
  };
  breakers: Record<string, { open: boolean; failures: number; reopensInMs: number }>;
};

function fmtAge(ms: number | null): string {
  if (ms === null) return "never";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

/** Status: GET /api/_ops/status, render as compact markdown.
 *  Uses the per-machine bearer (cfg.auth.key); `read` scope, so any
 *  registered machine can fetch operational health without holding the
 *  admin password. */
async function status(): Promise<void> {
  const cfg = loadConfig();
  const resp = await fetch(serverUrl(cfg, "/api/_ops/status"), {
    headers: { Authorization: `Bearer ${cfg.auth.key}` },
  });
  if (!resp.ok) {
    throw new Error(
      `GET /api/_ops/status failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`,
    );
  }
  const r = (await resp.json()) as StatusResponse;

  console.log(`# /mneme:status — ${r.generated_at}`);
  console.log("");
  console.log("## Workers");
  if (!r.workers.length) {
    console.log("(none registered)");
  } else {
    console.log("| job | last run | status | duration | next | overdue |");
    console.log("|---|---|---|---|---|---|");
    for (const w of r.workers) {
      const dur = w.last_duration_ms !== null ? `${w.last_duration_ms}ms` : "-";
      const overdue = w.overdue_ms > 0 ? fmtAge(w.overdue_ms) : "-";
      const status = w.last_status ?? "-";
      const err = w.last_error ? ` (${w.last_error.slice(0, 40)})` : "";
      console.log(
        `| ${w.name} | ${fmtAge(w.since_last_run_ms)} ago | ${status}${err} | ${dur} | in ${fmtAge(Math.max(0, new Date(w.next_run_at).getTime() - Date.now()))} | ${overdue} |`,
      );
    }
  }

  console.log("");
  console.log("## Daemons");
  if (!r.daemons.length) {
    console.log("(no heartbeats)");
  } else {
    console.log(
      "| machine | pending | extracted | embedded | failed | last processed | last seen |",
    );
    console.log("|---|---|---|---|---|---|---|");
    for (const d of r.daemons) {
      const label = d.machine_name ?? d.machine_id.slice(0, 8);
      const lastProc = d.last_processed_at
        ? fmtAge(Date.now() - new Date(d.last_processed_at).getTime())
        : "never";
      const seen = `${fmtAge(d.since_posted_ms)} ago${d.stale ? " ⚠ stale" : ""}`;
      console.log(
        `| ${label} | ${d.outbox_pending} | ${d.outbox_extracted} | ${d.outbox_embedded} | ${d.outbox_failed} | ${lastProc} ago | ${seen} |`,
      );
    }
  }

  console.log("");
  console.log("## Dream");
  const lastWin = r.dream.last_window_at
    ? `${fmtAge(Date.now() - new Date(r.dream.last_window_at).getTime())} ago`
    : "never";
  console.log(`- last window: ${lastWin}`);
  console.log(`- last cluster count: ${r.dream.last_cluster_count ?? "-"}`);
  console.log(
    `- in-flight claims: ${r.dream.in_flight}${r.dream.stuck > 0 ? ` (⚠ ${r.dream.stuck} stuck > 30m)` : ""}`,
  );

  console.log("");
  console.log("## Breakers");
  for (const [name, b] of Object.entries(r.breakers)) {
    const state = b.open
      ? `⚠ open (reopens in ${fmtAge(b.reopensInMs)})`
      : b.failures > 0
        ? `closed (${b.failures} recent failures)`
        : "closed";
    console.log(`- ${name}: ${state}`);
  }
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

/** List registered machines. Uses the per-machine bearer; `read` scope,
 *  so listing works on any machine with a config, no admin password
 *  required. */
async function machines(): Promise<void> {
  const cfg = loadConfig();
  const resp = await fetch(serverUrl(cfg, "/api/auth/machines"), {
    headers: { Authorization: `Bearer ${cfg.auth.key}` },
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

/** Revoke a machine. machine_id on argv; admin password resolved via
 *  env → encrypted config → stdin ladder. */
async function revoke(machineId: string): Promise<void> {
  if (!machineId) throw new Error("machine_id required");
  const cfg = loadConfig();
  const adminPassword = await resolveAdminPassword(cfg);
  if (!adminPassword) throw new Error("admin password required");
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
    adminPassword: (values["admin-password"] as string | undefined) ?? positionals[1] ?? "",
    name: (values.name as string | undefined) ?? positionals[2],
  };
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  // One INFO line per slash invocation so the dashboard log panel
  // shows which command ran without needing CC's transcript. Args are
  // omitted (might contain memory text/uuids the user just typed) —
  // only the command name is logged.
  plog("INFO", `slash.${cmd ?? "unknown"}`, "invoked");
  switch (cmd) {
    case "setup": {
      const { url, adminPassword, name } = parseSetupArgs(process.argv.slice(3));
      await setup(url, adminPassword, name);
      return;
    }
    case "memory":
      await memory();
      return;
    case "handoff":
      await handoff(process.argv[3] ?? "");
      return;
    case "pin":
      await pin(process.argv[3] ?? "");
      return;
    case "unpin":
      await unpin(process.argv[3] ?? "");
      return;
    case "archive":
      await archive(process.argv[3] ?? "", true);
      return;
    case "unarchive":
      await archive(process.argv[3] ?? "", false);
      return;
    case "supersede":
      await supersede(process.argv[3] ?? "", process.argv[4] ?? "", true);
      return;
    case "unsupersede":
      await supersede(process.argv[3] ?? "", "", false);
      return;
    case "machines":
      await machines();
      return;
    case "status":
      await status();
      return;
    case "help":
      await help();
      return;
    case "dashboard":
      await dashboard();
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
        "usage: slash.ts <setup|memory|handoff|pin|unpin|archive|unarchive|supersede|unsupersede|machines|status|help|dashboard|revoke|rename> [args]",
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
