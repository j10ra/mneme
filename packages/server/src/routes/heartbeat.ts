// /api/heartbeat - daemon posts every 60s with current outbox depth.
//
// One row per machine in _ops.daemon_heartbeats; UPSERT on machine_id.
// Surfaces in /api/auth/machines so the operator can see "is my daemon
// processing?" at a glance. Not historical, not metric-store grade —
// this is a liveness signal, not a time-series.

import { Hono } from "hono";
import { Logger, currentAuth, mnemeRoute, requireAuth } from "@mneme/core";
import { sql } from "../infra/db.ts";

export type HeartbeatPayload = {
  outbox_pending: number;
  outbox_extracted: number;
  outbox_embedded: number;
  outbox_failed: number;
  last_processed_at: Date | string | null;
};

export async function upsertHeartbeat(machineId: string, payload: HeartbeatPayload): Promise<void> {
  await sql`
    INSERT INTO _ops.daemon_heartbeats (
      machine_id,
      outbox_pending, outbox_extracted, outbox_embedded, outbox_failed,
      last_processed_at, posted_at
    )
    VALUES (
      ${machineId},
      ${payload.outbox_pending}, ${payload.outbox_extracted},
      ${payload.outbox_embedded}, ${payload.outbox_failed},
      ${payload.last_processed_at as never}, now()
    )
    ON CONFLICT (machine_id) DO UPDATE
    SET outbox_pending = EXCLUDED.outbox_pending,
        outbox_extracted = EXCLUDED.outbox_extracted,
        outbox_embedded = EXCLUDED.outbox_embedded,
        outbox_failed = EXCLUDED.outbox_failed,
        last_processed_at = EXCLUDED.last_processed_at,
        posted_at = EXCLUDED.posted_at
  `;
}

function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
    return Math.floor(v);
  }
  return null;
}

export function mountHeartbeatRoute(app: Hono): void {
  app.post("/api/heartbeat", mnemeRoute("api.heartbeat"), requireAuth("capture"), async (c) => {
    const auth = currentAuth();
    if (!auth?.machineId) {
      return c.json({ error: "heartbeat requires per-machine token" }, 400);
    }
    const raw = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!raw) return c.json({ error: "invalid_json" }, 400);

    const fields = {
      outbox_pending: asInt(raw.outbox_pending),
      outbox_extracted: asInt(raw.outbox_extracted),
      outbox_embedded: asInt(raw.outbox_embedded),
      outbox_failed: asInt(raw.outbox_failed),
    };
    for (const [k, v] of Object.entries(fields)) {
      if (v === null) {
        return c.json({ error: `${k} must be a non-negative integer` }, 400);
      }
    }

    const lastProcessedAt =
      typeof raw.last_processed_at === "string" ? new Date(raw.last_processed_at) : null;

    await upsertHeartbeat(auth.machineId, {
      outbox_pending: fields.outbox_pending!,
      outbox_extracted: fields.outbox_extracted!,
      outbox_embedded: fields.outbox_embedded!,
      outbox_failed: fields.outbox_failed!,
      last_processed_at: lastProcessedAt,
    });
    Logger.debug("heartbeat", { machine_id: auth.machineId, ...fields });
    return c.json({ ok: true });
  });
}
