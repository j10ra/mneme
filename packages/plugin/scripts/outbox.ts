// Local queue for /api/capture POSTs that failed (server down, network blip).
// Drained by the SessionStart hook on next session start.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { scrubData } from "./scrub.ts";

const OUTBOX_DIR = join(homedir(), ".mneme", "outbox");

export function outboxDir(): string {
  return OUTBOX_DIR;
}

export function ensureOutbox(): void {
  if (!existsSync(OUTBOX_DIR)) mkdirSync(OUTBOX_DIR, { recursive: true, mode: 0o700 });
}

export function writeOutbox(payload: unknown, source: string): void {
  ensureOutbox();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const safe = source.replace(/[^a-z0-9_-]/gi, "_");
  const filename = join(OUTBOX_DIR, `${ts}-${safe}.json`);
  // 0600 — outbox files contain raw capture payloads (prompts, tool inputs,
  // and assistant turns) that haven't been delivered yet. They sit on disk
  // until the next SessionStart drains them; default umask would leave them
  // group/other-readable. Match the config.json policy. Scrub before write
  // so no secret ever touches disk plaintext, even briefly.
  const cleaned = JSON.stringify(scrubData(payload));
  writeFileSync(filename, cleaned, { mode: 0o600 });
}

export async function drainOutbox(
  send: (body: unknown) => Promise<boolean>,
): Promise<{ sent: number; failed: number }> {
  ensureOutbox();
  let sent = 0;
  let failed = 0;
  const files = readdirSync(OUTBOX_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  for (const file of files) {
    const path = join(OUTBOX_DIR, file);
    let raw: string;
    try {
      raw = readFileSync(path, "utf8");
    } catch {
      failed++;
      continue;
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      // Corrupt file — drop it so it doesn't block the queue.
      unlinkSync(path);
      failed++;
      continue;
    }
    // Self-heal pre-fix files: re-scrub on drain and rewrite if it changed.
    // After this fix lands, new files are already scrubbed at write time;
    // this only modifies bytes for files left behind by older versions.
    // Without it, secrets in legacy outbox files would sit on disk until
    // the server happened to be reachable for a successful drain.
    const cleanedJson = JSON.stringify(scrubData(body));
    if (cleanedJson !== raw) {
      try {
        writeFileSync(path, cleanedJson, { mode: 0o600 });
      } catch {
        // Best-effort. Send still proceeds with the in-memory scrubbed copy.
      }
      body = JSON.parse(cleanedJson);
    }
    try {
      const ok = await send(body);
      if (ok) {
        unlinkSync(path);
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
