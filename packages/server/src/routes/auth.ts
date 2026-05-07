// Routes for issuing/revoking/renaming per-machine bearer tokens.
//
// Admin-password gated:
//   POST /api/auth/register {machine_name}     → mints a token, returns once
//   POST /api/auth/revoke   {machine_id}       → marks the row revoked
//   GET  /api/auth/machines                    → lists active machines
//
// Self-rename (per-machine token gated):
//   POST /api/auth/rename   {machine_name}     → updates the calling machine's name
//
// Admin routes use requireAuth("admin") (only the ADMIN_PASSWORD bearer
// satisfies that). Self-rename is intentionally NOT admin: a machine can only
// rename itself, and the calling token's machine_id is the rename target.
// This matches the "your machine, your label" mental model and removes the
// footgun where renaming a different machine left that machine's local
// config stale. Admin debugging that needs to rename another machine goes
// via direct DB.

import { Hono } from "hono";
import { currentAuth, mnemeRoute, requireAuth } from "@mneme/core";
import { sql, sha256Hex } from "../infra/db.ts";

function generateToken(machineName: string): string {
  const safeName = machineName.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 32);
  const random = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(random).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `mneme_pat_${safeName}_${hex}`;
}

export function mountAuthRoutes(app: Hono): void {
  // ---------------------------------------------------------------------------
  // POST /api/auth/register — issue a per-machine token.
  // Body: { machine_name }. Returns { machine_id, machine_name, token }.
  // Token plaintext is shown ONCE; the DB stores sha256(token) only.
  // ---------------------------------------------------------------------------
  app.post(
    "/api/auth/register",
    mnemeRoute("api.auth.register"),
    requireAuth("admin"),
    async (c) => {
      const body = (await c.req.json().catch(() => null)) as {
        machine_name?: unknown;
      } | null;
      const machineName =
        typeof body?.machine_name === "string" && body.machine_name.trim()
          ? body.machine_name.trim()
          : "";
      if (!machineName) return c.json({ error: "machine_name required" }, 400);

      const machineId = crypto.randomUUID();
      const token = generateToken(machineName);
      const keyHash = await sha256Hex(token);

      // scopes defaults to {capture,read,mcp} from migration 0002.
      await sql`
        INSERT INTO _ops.api_keys (key_hash, name, machine_id)
        VALUES (${keyHash}, ${machineName}, ${machineId})
      `;

      return c.json({ machine_id: machineId, machine_name: machineName, token });
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/auth/revoke — revoke a machine's token.
  // Body: { machine_id }. Sets revoked_at on every active key for that machine.
  // ---------------------------------------------------------------------------
  app.post(
    "/api/auth/revoke",
    mnemeRoute("api.auth.revoke"),
    requireAuth("admin"),
    async (c) => {
      const body = (await c.req.json().catch(() => null)) as {
        machine_id?: unknown;
      } | null;
      const machineId =
        typeof body?.machine_id === "string" && body.machine_id.trim()
          ? body.machine_id.trim()
          : "";
      if (!machineId) return c.json({ error: "machine_id required" }, 400);

      const result = await sql`
        UPDATE _ops.api_keys
        SET revoked_at = now()
        WHERE machine_id = ${machineId} AND revoked_at IS NULL
      `;
      return c.json({ machine_id: machineId, revoked: result.count });
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/auth/rename — change THIS machine's display name in place.
  // Body: { machine_name }. The target machine_id is the calling token's own
  // machine (server-stamped from ctx.auth.machineId), not anything in the
  // body. A machine can only rename itself.
  //
  // No admin password — the per-machine bearer token is enough identity.
  // Admin tokens (machineId === null) get 400 here; admin rename of another
  // machine isn't supported by design (footgun: it would desync the target
  // machine's local config). If admin really needs to rename another machine,
  // do it via direct DB.
  //
  // Same row, same machine_id, same token, same captures/memories — only
  // _ops.api_keys.name changes. Avoids the bifurcated-history side effect
  // of revoke+re-register when all the user wants is a rename.
  // ---------------------------------------------------------------------------
  app.post(
    "/api/auth/rename",
    mnemeRoute("api.auth.rename"),
    requireAuth("capture"),
    async (c) => {
      const auth = currentAuth();
      const machineId = auth?.machineId;
      if (!machineId) {
        return c.json(
          { error: "self-rename requires a per-machine token, not admin" },
          400,
        );
      }
      const body = (await c.req.json().catch(() => null)) as {
        machine_name?: unknown;
      } | null;
      const machineName =
        typeof body?.machine_name === "string" && body.machine_name.trim()
          ? body.machine_name.trim()
          : "";
      if (!machineName) return c.json({ error: "machine_name required" }, 400);

      const result = await sql<{ id: string; name: string }[]>`
        UPDATE _ops.api_keys
        SET name = ${machineName}
        WHERE machine_id = ${machineId} AND revoked_at IS NULL
        RETURNING id, name
      `;
      if (result.length === 0) {
        return c.json({ error: "no active key for this machine" }, 404);
      }
      return c.json({
        machine_id: machineId,
        machine_name: machineName,
        renamed: result.length,
      });
    },
  );

  // ---------------------------------------------------------------------------
  // GET /api/auth/machines — list registered machines (active + revoked).
  // Each row carries the latest daemon heartbeat (if the daemon has
  // ever posted) so "is this machine's daemon healthy?" is answerable
  // from one call. heartbeat_* fields are null on machines without an
  // installed daemon or with a daemon that has never posted.
  // ---------------------------------------------------------------------------
  app.get(
    "/api/auth/machines",
    mnemeRoute("api.auth.machines"),
    requireAuth("admin"),
    async (c) => {
      const rows = await sql<
        {
          id: string;
          name: string;
          machine_id: string | null;
          scopes: string[];
          created_at: string;
          last_used_at: string | null;
          revoked_at: string | null;
          heartbeat_pending: number | null;
          heartbeat_extracted: number | null;
          heartbeat_embedded: number | null;
          heartbeat_failed: number | null;
          heartbeat_last_processed_at: string | null;
          heartbeat_posted_at: string | null;
        }[]
      >`
        SELECT
          k.id, k.name, k.machine_id, k.scopes,
          k.created_at, k.last_used_at, k.revoked_at,
          h.outbox_pending    AS heartbeat_pending,
          h.outbox_extracted  AS heartbeat_extracted,
          h.outbox_embedded   AS heartbeat_embedded,
          h.outbox_failed     AS heartbeat_failed,
          h.last_processed_at AS heartbeat_last_processed_at,
          h.posted_at         AS heartbeat_posted_at
        FROM _ops.api_keys k
        LEFT JOIN _ops.daemon_heartbeats h ON h.machine_id = k.machine_id
        ORDER BY k.created_at DESC
      `;
      return c.json({ machines: rows });
    },
  );
}
