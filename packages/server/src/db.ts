import postgres from "postgres";
import { env } from "./env.ts";

/** Admin pool — full schema access. Used by /api/capture, workers, auth. */
export const sql = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

/** Reader pool — connects as `mneme_reader` (SELECT-only on public.*).
 *  Used by the /mcp tool. Statement timeout enforced at connection level. */
export const readerSql = postgres(env.MNEME_READER_DATABASE_URL, {
  max: 5,
  idle_timeout: 30,
  connect_timeout: 10,
  connection: {
    statement_timeout: 5000 as never,
  },
});

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
