// Pure OAuth 2.1 helpers (#59). No DB, no Hono — just crypto, encoding,
// validation, and discovery-metadata shaping. The security-critical
// piece is verifyPkceS256; everything here is unit-tested.

import { timingSafeEqual } from "node:crypto";

/** Scopes an OAuth-issued token may ever carry. `capture` is excluded
 *  by construction so a connector token can read but never write. */
export const ISSUED_SCOPE = "read mcp";
const ISSUED_SCOPE_SET = new Set(["read", "mcp"]);

const ACCESS_TOKEN_PREFIX = "mneme_oauth";
const REFRESH_TOKEN_PREFIX = "mneme_refresh";
const CODE_PREFIX = "mneme_code";

export function base64url(bytes: Uint8Array): string {
  let bin = "";

  for (const b of bytes) bin += String.fromCharCode(b);

  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return new Uint8Array(hash);
}

export async function sha256hex(input: string): Promise<string> {
  return Array.from(await sha256(input))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string compare; length mismatch is a miss. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");

  if (ab.length !== bb.length) return false;

  return timingSafeEqual(ab, bb);
}

/** PKCE S256: challenge === base64url(sha256(verifier)). Compared in
 *  constant time. Empty inputs always fail. */
export async function verifyPkceS256(verifier: string, challenge: string): Promise<boolean> {
  if (!verifier || !challenge) return false;

  return safeEqual(base64url(await sha256(verifier)), challenge);
}

function randomToken(prefix: string, bytes = 32): string {
  return `${prefix}_${base64url(crypto.getRandomValues(new Uint8Array(bytes)))}`;
}

export function newAccessToken(): string {
  return randomToken(ACCESS_TOKEN_PREFIX);
}

export function newRefreshToken(): string {
  return randomToken(REFRESH_TOKEN_PREFIX);
}

export function newAuthCode(): string {
  return randomToken(CODE_PREFIX);
}

export function newClientId(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(16)));
}

/** Force any requested scope down to the read-only issued set. */
export function scopeToArray(scope: string | undefined): string[] {
  const requested = (scope ?? ISSUED_SCOPE).trim().split(/\s+/).filter(Boolean);
  const allowed = requested.filter((s) => ISSUED_SCOPE_SET.has(s));

  return allowed.length > 0 ? allowed : ["read", "mcp"];
}

/** A redirect_uri acceptable at registration time: https anywhere,
 *  http only on loopback, or a native-app custom scheme. */
export function redirectUriRegistrable(uri: string): boolean {
  let u: URL;

  try {
    u = new URL(uri);
  } catch {
    return false;
  }

  if (u.protocol === "https:") return true;

  if (u.protocol === "http:") {
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
  }

  // Native-app custom scheme (e.g. com.example.app:/oauth).
  return /^[a-z][a-z0-9+.-]*:$/i.test(u.protocol);
}

/** Exact-match a presented redirect_uri against a client's registered
 *  set. Constant-time per candidate; no normalization. */
export function redirectUriAllowed(registered: string[], given: string): boolean {
  return registered.some((r) => safeEqual(r, given));
}

export function authServerMetadata(issuer: string) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["read", "mcp"],
  };
}

export function protectedResourceMetadata(issuer: string, resource: string) {
  return {
    resource,
    authorization_servers: [issuer],
    scopes_supported: ["read", "mcp"],
    bearer_methods_supported: ["header"],
  };
}
