import { timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import type postgres from "postgres";
import { storage } from "./context.ts";
import { Logger } from "./logger.ts";

let _sql: postgres.Sql | undefined;

export function configureAuth(sql: postgres.Sql): void {
  _sql = sql;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashKey(plaintext: string): Promise<string> {
  return sha256Hex(plaintext);
}

/** Constant-time string compare. Length mismatch is treated as a miss
 *  without invoking timingSafeEqual (which throws on mismatched buffers). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

type ApiKeyRow = {
  id: string;
  name: string;
  machine_id: string | null;
  scopes: string[];
};

/** Bearer-token + scope check middleware. Run inside mnemeRoute. */
export function requireAuth(scope: string): MiddlewareHandler {
  return async (c, next) => {
    if (!_sql) {
      Logger.error("auth not configured: call configureAuth(sql) before using requireAuth");
      return c.json({ error: "auth_misconfigured" }, 500);
    }

    const header = c.req.header("authorization") ?? "";
    const match = /^Bearer\s+(\S+)$/.exec(header);
    if (!match) {
      return c.json({ error: "unauthorized" }, 401);
    }
    const key = match[1];
    if (!key) {
      return c.json({ error: "unauthorized" }, 401);
    }

    // Admin-password emergency bearer. Bypasses _ops.api_keys lookup so you
    // can recover even if the table is empty / corrupt / all keys revoked.
    // Logs every use loudly so unintended usage is visible in production.
    const adminPassword = process.env.ADMIN_PASSWORD ?? "";
    if (adminPassword && safeEqual(key, adminPassword)) {
      Logger.warn(`auth: admin token used directly (scope=${scope})`);
      const ctx = storage.getStore();
      if (ctx) {
        ctx.auth = {
          keyId: "admin",
          name: "admin",
          machineId: null,
          scopes: ["*"],
        };
      }
      await next();
      return;
    }

    const keyHash = await sha256Hex(key);

    const rows = await _sql<ApiKeyRow[]>`
      SELECT id, name, machine_id, scopes
      FROM _ops.api_keys
      WHERE key_hash = ${keyHash}
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      return c.json({ error: "unauthorized" }, 401);
    }
    if (!row.scopes.includes(scope)) {
      return c.json({ error: "forbidden", required: scope }, 403);
    }

    const ctx = storage.getStore();
    if (ctx) {
      ctx.auth = {
        keyId: row.id,
        name: row.name,
        machineId: row.machine_id,
        scopes: row.scopes,
      };
    }

    // Fire-and-forget last_used_at update.
    void _sql`
      UPDATE _ops.api_keys
      SET last_used_at = now()
      WHERE id = ${row.id}
    `.catch((err) => Logger.warn("last_used_at update failed", err));

    await next();
  };
}
