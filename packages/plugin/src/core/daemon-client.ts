// Harness-neutral local-daemon client. The daemon is one-per-machine and
// harness-agnostic; both the Claude Code hook and the Pi adapter talk to it
// over loopback. Kept tiny and fail-open — a daemon miss must never break the
// agent loop (the daemon's idle worker tick drains pending captures anyway).

import type { MnemeConfig } from "./config.ts";

const FLUSH_TIMEOUT_MS = 1500;

/** Fire-and-forget ping to the local daemon's /flush endpoint. Used at natural
 *  session boundaries (Claude PreCompact/SessionEnd, Pi session_compact/
 *  session_shutdown) to skip the daemon's idle window and process pending
 *  captures immediately. Returns void: a flush failure is non-fatal. */
export async function pingDaemonFlush(cfg: MnemeConfig): Promise<void> {
  if (!cfg.daemon) return;

  try {
    await fetch(`http://127.0.0.1:${cfg.daemon.port}/flush`, {
      method: "POST",
      signal: AbortSignal.timeout(FLUSH_TIMEOUT_MS),
    });
  } catch {
    // Daemon unreachable; idle gate will eventually fire.
  }
}
