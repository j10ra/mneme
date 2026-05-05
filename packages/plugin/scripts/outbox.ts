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
  // group/other-readable. Match the config.json policy.
  writeFileSync(filename, JSON.stringify(payload), { mode: 0o600 });
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
    let body: unknown;
    try {
      body = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      // Corrupt file — drop it so it doesn't block the queue.
      unlinkSync(path);
      failed++;
      continue;
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
