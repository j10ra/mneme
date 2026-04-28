import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL not set (check .env)");
}

const readerUrl = process.env.MNEME_READER_DATABASE_URL;
if (!readerUrl) {
  throw new Error("MNEME_READER_DATABASE_URL not set (check .env)");
}

/** Admin pool — full schema access. Used by /api/capture, workers, auth. */
export const sql = postgres(url, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

/** Reader pool — connects as `mneme_reader` (SELECT-only on public.*).
 *  Used by the /mcp tool. Statement timeout enforced at connection level. */
export const readerSql = postgres(readerUrl, {
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
