// Harness-neutral capture write path. Mirrors the durability contract of
// the Claude Code hook's filesystem fallback (hook.ts:writeToDaemonOutbox):
// scrub, redact this machine's literal secrets, then atomically drop a
// capture JSON into the daemon's outbox so the daemon's fs.watch tick drains
// it. No HTTP, no daemon-port dependency — capture is a must-not-lose write
// and the outbox + daemon own durability and batching.
//
// The Claude Code hook keeps its own inline copy (it predates this module and
// runs one process per event); this core exists for long-lived harness
// extensions (Pi) that register event handlers against a single config load.
// Node-builtin only, so it runs unchanged under Pi's toolchain.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { decryptAdminPassword } from "./admin-secret.ts";
import type { MnemeConfig } from "./config.ts";
import { scrubData } from "./scrub.ts";

/** Max capture content size. Mirrors hook.ts: a batch of oversize captures
 *  chokes the extract API, and a single inline base64 blob can sail under a
 *  naive cap, so the cap is measured AFTER structured scrubbing stubs it. */
export const MAX_CAPTURE_BYTES = 64 * 1024;

// Tool names whose captures carry no project signal or would recurse into the
// memory system itself. Pi's built-in tools (bash/read/edit/write/grep/find/
// ls) ARE worth capturing — they're the actual work — so the static list is
// intentionally empty; the regex guard is the real filter.
const SKIP_TOOLS = new Set<string>([]);

export function shouldSkipTool(toolName: unknown): boolean {
  if (typeof toolName !== "string") return false;
  if (SKIP_TOOLS.has(toolName)) return true;
  // Recursive: own MCP tool (mneme_sql) + claude-mem tools.
  if (/mneme/i.test(toolName) || /claude[-_]?mem/i.test(toolName)) return true;
  return false;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Default outbox queue the daemon drains. Mirrors hook.ts exactly. */
export function defaultOutboxDir(): string {
  return join(homedir(), ".mneme", "outbox", "capture", "captured");
}

/** Build a per-machine literal redactor: strip any verbatim occurrence of
 *  THIS machine's secrets (per-machine bearer + admin password, when stored).
 *  Belt for the shared scrubber's pattern braces — admin passwords are
 *  arbitrary user-chosen strings with no fixed shape. Run AFTER scrubData.
 *  Mirrors hook.ts:buildLocalRedactor. */
function buildLocalRedactor(cfg: MnemeConfig): (s: string) => string {
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

function redactInPlace(obj: Record<string, unknown>, redact: (s: string) => string): void {
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

/** Serialize a tool call into a capture observation, scrubbing the structured
 *  input/result FIRST so inline base64 (screenshots, docs) is stubbed before
 *  the size cap is measured — otherwise a ~50KB blob sails under the cap and
 *  later chokes the batch extract API (see hook.ts PostToolUse). Returns null
 *  when the scrubbed observation still exceeds MAX_CAPTURE_BYTES. */
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

/** Truncate a string to a byte-ish char budget with a visible marker. */
export function truncate(s: string, max = MAX_CAPTURE_BYTES): string {
  return s.length > max ? `${s.slice(0, max)}…[truncated ${s.length - max}b]` : s;
}

/** Scrub + machine-local redact, then atomically write the capture into the
 *  daemon outbox. Returns true on success. id = `<ms>-<sha8(content)>`, the
 *  same format handleCapture/hook.ts use so daemon-side dedup keys line up.
 *  Fail-open: any error returns false rather than throwing into the harness. */
export function writeCapture(
  cfg: MnemeConfig,
  body: Record<string, unknown>,
  opts: { outboxDir?: string } = {},
): boolean {
  try {
    const cleaned = scrubData(body) as Record<string, unknown>;
    redactInPlace(cleaned, buildLocalRedactor(cfg));
    const content = typeof cleaned.content === "string" ? cleaned.content : "";
    const id = `${Date.now()}-${sha256Hex(content).slice(0, 8)}`;
    const dir = opts.outboxDir ?? defaultOutboxDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    const tmp = join(dir, `.${id}.json.tmp`);
    const final = join(dir, `${id}.json`);
    writeFileSync(tmp, JSON.stringify(cleaned));
    renameSync(tmp, final);
    return true;
  } catch {
    return false;
  }
}
