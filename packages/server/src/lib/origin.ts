// Canonical public origin for OAuth discovery metadata and the /mcp
// WWW-Authenticate challenge (#59). PUBLIC_URL wins; otherwise it is
// reconstructed from X-Forwarded-* — Railway terminates TLS at the edge,
// so the raw request URL is http://<internal-host>, wrong for metadata.

import type { Context } from "hono";
import { env } from "../infra/env.ts";

export function publicOrigin(c: Context): string {
  if (env.PUBLIC_URL) return env.PUBLIC_URL.replace(/\/$/, "");

  const url = new URL(c.req.url);
  const proto =
    c.req.header("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host =
    c.req.header("x-forwarded-host")?.split(",")[0]?.trim() || c.req.header("host") || url.host;

  return `${proto}://${host}`;
}
