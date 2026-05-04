import { Logger } from "@mneme/core";
import { sql } from "../db.ts";

const HEARTBEAT_MS = 24 * 60 * 60 * 1000; // 24h

const SINGLETON_KEY = Symbol.for("mneme.keepalive.singleton");
type State = { stopped: boolean; timer: ReturnType<typeof setInterval> | null };
const g = globalThis as unknown as { [key: symbol]: State | undefined };

if (g[SINGLETON_KEY]) {
  g[SINGLETON_KEY].stopped = true;
  if (g[SINGLETON_KEY].timer) clearInterval(g[SINGLETON_KEY].timer);
}
const state: State = { stopped: false, timer: null };
g[SINGLETON_KEY] = state;

/** Periodic SELECT 1 against Supabase. Free-tier projects pause after long
 *  inactivity windows; this guarantees a heartbeat even if the ingest queue
 *  drains and the workers idle longer than expected. */
export function startKeepalive(): void {
  Logger.info(`keepalive: heartbeat every ${HEARTBEAT_MS / 3600000}h`);
  state.timer = setInterval(async () => {
    if (state.stopped) return;
    try {
      await sql`SELECT 1`;
    } catch (e) {
      Logger.warn("keepalive: SELECT 1 failed", e);
    }
  }, HEARTBEAT_MS);
}
