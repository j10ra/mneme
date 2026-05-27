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
import type postgres from "postgres";
import { currentAuth, mnemeRoute, requireAuth } from "@mneme/core";
import { sql, sha256Hex } from "../infra/db.ts";

// eslint-disable-next-line @typescript-eslint/ban-types
type SqlClient = postgres.ISql<{}>;

function generateToken(machineName: string): string {
  const safeName = machineName
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase()
    .slice(0, 32);
  const random = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(random)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `mneme_pat_${safeName}_${hex}`;
}

export type RegisterResult = {
  machine_id: string;
  machine_name: string;
  token: string;
  /** True when a row with the same fingerprint already existed and the
   *  token was rotated in place (machine_id reused). False when this is
   *  a fresh machine_id. */
  reused_machine_id: boolean;
};

/** Hard delete every api_keys row for a machine. Used by:
 *   - /api/auth/revoke (operator terminates a machine's access)
 *   - registerOrRotate's reuse path (rotate = out with the old, in with new)
 *  Confirmation lives upstream: /mneme:revoke prompts before posting and
 *  /mneme:setup is itself a deliberate action. No revoked_at tombstone —
 *  absence of the row IS the audit trail. */
async function deleteMachineKeys(machineId: string, client: SqlClient): Promise<number> {
  const result = await client`
    DELETE FROM _ops.api_keys WHERE machine_id = ${machineId}
  `;
  return result.count;
}

/** Pure upsert: rotates token + reuses machine_id when an active row
 *  shares the fingerprint, else mints fresh. Exported so tests can hit
 *  the data path without going through Hono. */
export async function registerOrRotate(input: {
  machineName: string;
  fingerprint: string | null;
}): Promise<RegisterResult> {
  const { machineName, fingerprint } = input;

  if (fingerprint) {
    const existing = await sql<{ machine_id: string; name: string }[]>`
      SELECT machine_id, name
      FROM _ops.api_keys
      WHERE machine_fingerprint = ${fingerprint}
        AND machine_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const row = existing[0];
    if (row) {
      const reusedId = row.machine_id;
      const reusedName = row.name;
      const token = generateToken(reusedName);
      const keyHash = await sha256Hex(token);
      // Single transaction so the old token is never valid alongside
      // the new one and the unique fingerprint index never sees both.
      await sql.begin(async (tx) => {
        await deleteMachineKeys(reusedId, tx);
        await tx`
          INSERT INTO _ops.api_keys
            (key_hash, name, machine_id, machine_fingerprint)
          VALUES (${keyHash}, ${reusedName}, ${reusedId}, ${fingerprint})
        `;
      });
      return {
        machine_id: reusedId,
        machine_name: reusedName,
        token,
        reused_machine_id: true,
      };
    }
  }

  const machineId = crypto.randomUUID();
  const token = generateToken(machineName);
  const keyHash = await sha256Hex(token);
  await sql`
    INSERT INTO _ops.api_keys
      (key_hash, name, machine_id, machine_fingerprint)
    VALUES (${keyHash}, ${machineName}, ${machineId}, ${fingerprint})
  `;
  return {
    machine_id: machineId,
    machine_name: machineName,
    token,
    reused_machine_id: false,
  };
}

export function mountAuthRoutes(app: Hono): void {
  // ---------------------------------------------------------------------------
  // POST /api/auth/register — issue a per-machine token.
  // Body: { machine_name, machine_fingerprint? }.
  // Returns { machine_id, machine_name, token, reused_machine_id }.
  // Token plaintext is shown ONCE; the DB stores sha256(token) only.
  //
  // Fingerprint upsert (re-install on the same machine):
  //   When `machine_fingerprint` is provided AND already exists on an
  //   active key row, this rotates the token in place: revoke any active
  //   keys for that machine_id, insert a fresh row reusing the existing
  //   machine_id + name + fingerprint. The user's captures, memories, and
  //   clusters keep their machine_id; only the bearer token changes. The
  //   `machine_name` from the body is ignored on a fingerprint match (use
  //   /api/auth/rename to change the name).
  //
  //   When the fingerprint is absent (old plugin versions), or no active
  //   row matches, a fresh machine_id is minted. Same as pre-fingerprint
  //   behavior.
  // ---------------------------------------------------------------------------
  app.post(
    "/api/auth/register",
    mnemeRoute("api.auth.register"),
    requireAuth("admin"),
    async (c) => {
      const body = (await c.req.json().catch(() => null)) as {
        machine_name?: unknown;
        machine_fingerprint?: unknown;
      } | null;
      const machineName =
        typeof body?.machine_name === "string" && body.machine_name.trim()
          ? body.machine_name.trim()
          : "";
      if (!machineName) return c.json({ error: "machine_name required" }, 400);
      const fingerprint =
        typeof body?.machine_fingerprint === "string" && body.machine_fingerprint.trim()
          ? body.machine_fingerprint.trim()
          : null;

      const result = await registerOrRotate({ machineName, fingerprint });
      return c.json(result);
    },
  );

  // ---------------------------------------------------------------------------
  // POST /api/auth/revoke — revoke a machine's token.
  // Body: { machine_id }. Hard-deletes every api_keys row for that machine.
  // ---------------------------------------------------------------------------
  app.post("/api/auth/revoke", mnemeRoute("api.auth.revoke"), requireAuth("admin"), async (c) => {
    const body = (await c.req.json().catch(() => null)) as {
      machine_id?: unknown;
    } | null;
    const machineId =
      typeof body?.machine_id === "string" && body.machine_id.trim() ? body.machine_id.trim() : "";
    if (!machineId) return c.json({ error: "machine_id required" }, 400);

    const revoked = await deleteMachineKeys(machineId, sql);
    return c.json({ machine_id: machineId, revoked });
  });

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
  app.post("/api/auth/rename", mnemeRoute("api.auth.rename"), requireAuth("capture"), async (c) => {
    const auth = currentAuth();
    const machineId = auth?.machineId;
    if (!machineId) {
      return c.json({ error: "self-rename requires a per-machine token, not admin" }, 400);
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
  });

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
    // Read scope (not admin): listing isn't an admin action. The
    // operator-only ops are register + revoke, which keep `admin`
    // below. Per-machine bearers can list to power /mneme:machines
    // and the dashboard's machines panel.
    requireAuth("read"),
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
        LEFT JOIN _ops.daemon_heartbeats h ON h.machine_id::text = k.machine_id
        ORDER BY k.created_at DESC
      `;
      return c.json({ machines: rows });
    },
  );
}
