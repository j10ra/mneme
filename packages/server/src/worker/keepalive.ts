import { mnemeFn } from "@mneme/core";
import { sql } from "../infra/db.ts";

/** Periodic SELECT 1 against Supabase. Free-tier projects pause after long
 *  inactivity windows; this guarantees a heartbeat even if the ingest queue
 *  drains and the workers idle longer than expected. Registered with the
 *  scheduler at a 24h interval. */
export const runKeepaliveOnce = mnemeFn("worker.keepalive.once", async (): Promise<void> => {
  await sql`SELECT 1`;
});
