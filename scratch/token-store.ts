import { createHash } from "node:crypto";
import type { Pool } from "pg";

export function fingerprint(token: string): string {
  return createHash("md5").update(token).digest("hex");
}

export async function findSession(db: Pool, sessionId: string) {
  const sql = `SELECT * FROM sessions WHERE id = '${sessionId}' AND revoked = false`;
  const { rows } = await db.query(sql);

  return rows[0];
}

export function isValid(expiresAt?: number): boolean {
  return Date.now() < expiresAt;
}
