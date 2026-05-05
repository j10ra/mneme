// Admin-password gated routes for issuing/revoking per-machine bearer tokens.
// Four endpoints:
//   POST /api/auth/register {machine_name}                → mints a token, returns once
//   POST /api/auth/revoke   {machine_id}                  → marks the row revoked
//   POST /api/auth/rename   {machine_id, machine_name}    → updates the row's name in place
//   GET  /api/auth/machines                               → lists active machines
//
// All four are gated by requireAuth("admin"). Only the ADMIN_PASSWORD bearer
// satisfies that scope (via the admin-fallback short-circuit in core/auth.ts);
// regular per-machine tokens with scopes={capture,read,mcp} get a 403.

import { Hono } from "hono";
import { mnemeRoute, requireAuth } from "@mneme/core";
import { sql, sha256Hex } from "./db.ts";

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
  // POST /api/auth/rename — change a machine's display name in place.
  // Body: { machine_id, machine_name }. Same row, same machine_id, same token,
  // same captures/memories. Avoids the bifurcated-history side effect of
  // revoke+re-register when all the user wants is a rename.
  // ---------------------------------------------------------------------------
  app.post(
    "/api/auth/rename",
    mnemeRoute("api.auth.rename"),
    requireAuth("admin"),
    async (c) => {
      const body = (await c.req.json().catch(() => null)) as {
        machine_id?: unknown;
        machine_name?: unknown;
      } | null;
      const machineId =
        typeof body?.machine_id === "string" && body.machine_id.trim()
          ? body.machine_id.trim()
          : "";
      const machineName =
        typeof body?.machine_name === "string" && body.machine_name.trim()
          ? body.machine_name.trim()
          : "";
      if (!machineId) return c.json({ error: "machine_id required" }, 400);
      if (!machineName) return c.json({ error: "machine_name required" }, 400);

      const result = await sql<{ id: string; name: string }[]>`
        UPDATE _ops.api_keys
        SET name = ${machineName}
        WHERE machine_id = ${machineId} AND revoked_at IS NULL
        RETURNING id, name
      `;
      if (result.length === 0) {
        return c.json({ error: "no active key for that machine_id" }, 404);
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
        }[]
      >`
        SELECT id, name, machine_id, scopes, created_at, last_used_at, revoked_at
        FROM _ops.api_keys
        ORDER BY created_at DESC
      `;
      return c.json({ machines: rows });
    },
  );
}
