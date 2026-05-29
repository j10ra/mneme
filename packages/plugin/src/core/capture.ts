// Harness-neutral capture core. The single implementation of the capture
// write path — scrub, redact this machine's literal secrets, and atomically
// drop a capture JSON into the daemon's outbox (the daemon's fs.watch tick
// drains it). Both harnesses funnel through here:
//   - Claude Code (src/claude/hook.ts): one process per event; POSTs to the
//     local daemon's /capture, falls back to writeToOutbox when it's down.
//   - Pi (src/pi/capture.ts): one long-lived process; writes straight to
//     the outbox via writeCapture (no HTTP hop).
// Capture is a must-not-lose write, so the outbox + daemon own durability and
// batching. Node-builtin only, so this runs unchanged under Pi's toolchain.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { decryptAdminPassword } from "./admin-secret.ts";
import type { MnemeConfig } from "./config.ts";
import { scrubData } from "./scrub.ts";

/** Max capture content size. Mirrors the server intake: a batch of oversize
 *  captures chokes the extract API, and a single inline base64 blob can sail
 *  under a naive cap, so the cap is measured AFTER structured scrubbing. */
export const MAX_CAPTURE_BYTES = 64 * 1024;

/** Tools whose captures would recurse into the memory system itself — the
 *  recall MCP tool (mneme_sql) and claude-mem. Shared by every harness; each
 *  harness layers its own static skip-list on top (CC: TodoWrite, Skill, …). */
export function isRecursiveTool(toolName: unknown): boolean {
  if (typeof toolName !== "string") return false;
  return /mneme/i.test(toolName) || /claude[-_]?mem/i.test(toolName);
}

/** Pi skip predicate: its built-in tools (bash/read/edit/…) are real work and
 *  worth capturing, so only the recursive guard applies. */
export function shouldSkipTool(toolName: unknown): boolean {
  return isRecursiveTool(toolName);
}

// Sync SHA via node:crypto: Bun's WebCrypto can fail to resolve the awaited
// digest when a hook is spawned with payload piped to stdin (stdin EOF drains
// the loop before the digest microtask fires). createHash is synchronous and
// sidesteps it entirely.
function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Default outbox queue the daemon drains. */
export function defaultOutboxDir(): string {
  return join(homedir(), ".mneme", "outbox", "capture", "captured");
}

/** Build a per-machine literal redactor: strip any verbatim occurrence of THIS
 *  machine's secrets (per-machine bearer + admin password, when stored). Belt
 *  for the shared scrubber's pattern braces — admin passwords are arbitrary
 *  user-chosen strings with no fixed shape. Run AFTER scrubData. Sort
 *  longest-first for safe prefix handling; skip secrets under 8 chars. */
export function buildLocalRedactor(cfg: MnemeConfig): (s: string) => string {
  const secrets = new Set<string>();
  if (cfg.auth?.key) secrets.add(cfg.auth.key);
  const fromEnv = process.env.MNEME_ADMIN_PASSWORD;
  if (fromEnv) secrets.add(fromEnv);
  if (cfg.admin?.secret) {
    const pw = decryptAdminPassword(cfg.admin.secret);
    if (pw) secrets.add(pw);
  }
  const list = [...secrets].filter((s) => s.length >= 8).sort((a, b) => b.length - a.length);
  if (list.length === 0) return (s) => s;
  return (s) => {
    let out = s;
    for (const sec of list) {
      if (out.includes(sec)) out = out.split(sec).join("[REDACTED:mneme_secret]");
    }
    return out;
  };
}

export function redactInPlace(obj: Record<string, unknown>, redact: (s: string) => string): void {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") {
      obj[k] = redact(v);
    } else if (Array.isArray(v)) {
      obj[k] = v.map((item) =>
        typeof item === "string"
          ? redact(item)
          : item && typeof item === "object"
            ? (redactInPlace(item as Record<string, unknown>, redact), item)
            : item,
      );
    } else if (v && typeof v === "object") {
      redactInPlace(v as Record<string, unknown>, redact);
    }
  }
}

/** scrubData + machine-local literal redaction. The one redaction point every
 *  harness funnels a capture through before it leaves the machine. */
export function scrubAndRedact(
  cfg: MnemeConfig,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned = scrubData(body) as Record<string, unknown>;
  redactInPlace(cleaned, buildLocalRedactor(cfg));
  return cleaned;
}

/** Atomically write an ALREADY-cleaned capture body into the daemon outbox.
 *  id = `<ms>-<sha8(content)>`, the format handleCapture uses so daemon-side
 *  dedup keys line up. Returns false on any error (fail-open). */
export function writeToOutbox(
  cleaned: Record<string, unknown>,
  outboxDir: string = defaultOutboxDir(),
): boolean {
  try {
    const content = typeof cleaned.content === "string" ? cleaned.content : "";
    const id = `${Date.now()}-${sha256Hex(content).slice(0, 8)}`;
    if (!existsSync(outboxDir)) mkdirSync(outboxDir, { recursive: true, mode: 0o700 });
    const tmp = join(outboxDir, `.${id}.json.tmp`);
    const final = join(outboxDir, `${id}.json`);
    writeFileSync(tmp, JSON.stringify(cleaned));
    renameSync(tmp, final);
    return true;
  } catch {
    return false;
  }
}

/** scrub + redact + outbox write in one call. Used by long-lived harness
 *  extensions (Pi) that write straight to the outbox with no HTTP hop. */
export function writeCapture(
  cfg: MnemeConfig,
  body: Record<string, unknown>,
  opts: { outboxDir?: string } = {},
): boolean {
  try {
    return writeToOutbox(scrubAndRedact(cfg, body), opts.outboxDir ?? defaultOutboxDir());
  } catch {
    return false;
  }
}

/** Serialize a tool call into a capture observation, scrubbing the structured
 *  input/result FIRST so inline base64 (screenshots, docs) is stubbed before
 *  the size cap is measured — otherwise a ~50KB blob sails under the cap and
 *  later chokes the batch extract API. Returns null when the scrubbed
 *  observation still exceeds MAX_CAPTURE_BYTES. */
export function buildToolObservation(
  toolName: string,
  input: unknown,
  result: unknown,
  isError = false,
): string | null {
  const observation = JSON.stringify({
    tool: toolName,
    input: scrubData(input),
    result: scrubData(result),
    isError: Boolean(isError),
  });
  return observation.length > MAX_CAPTURE_BYTES ? null : observation;
}

/** Truncate a string to a char budget with a visible marker. */
export function truncate(s: string, max = MAX_CAPTURE_BYTES): string {
  return s.length > max ? `${s.slice(0, max)}…[truncated ${s.length - max}b]` : s;
}
