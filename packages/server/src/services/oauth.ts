// OAuth 2.1 service layer (#59): the DB-touching half. Pure crypto /
// validation lives in lib/oauth.ts. Issued access tokens are ordinary
// _ops.api_keys rows scoped read-only; refresh + auth codes get their
// own _ops tables. Single resource owner — authenticated at /authorize
// with ADMIN_PASSWORD, reusing the admin brute-force throttle.

import { timingSafeEqual } from "node:crypto";
import {
  adminLockActive,
  adminLockRetryAfterSec,
  clearIpFailures,
  recordAdminFailure,
} from "@mneme/core/auth-throttle";
import { sql, sha256Hex } from "../infra/db.ts";
import { env } from "../infra/env.ts";
import {
  ISSUED_SCOPE,
  newAccessToken,
  newAuthCode,
  newClientId,
  newRefreshToken,
  redirectUriAllowed,
  redirectUriRegistrable,
  scopeToArray,
} from "../lib/oauth.ts";

const AUTH_CODE_TTL_MS = 60_000;
const REFRESH_TTL_SEC = 60 * 60 * 24 * 365; // 1 year

// ---------------------------------------------------------------------------
// Resource-owner authentication (ADMIN_PASSWORD), throttle-aware.
// ---------------------------------------------------------------------------
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");

  if (ab.length !== bb.length) return false;

  return timingSafeEqual(ab, bb);
}

export type OwnerCheck = { ok: boolean; locked: boolean; retryAfter: number };

/** Verify the owner password at /authorize. Mirrors the admin-bearer
 *  posture in core/auth.ts: refuse to compare while the IP is locked,
 *  count terminal misses, clear suspicion on success. */
export function verifyOwnerPassword(password: string, ip: string): OwnerCheck {
  const admin = process.env.ADMIN_PASSWORD ?? "";

  if (!admin) return { ok: false, locked: false, retryAfter: 0 };

  if (adminLockActive(ip)) {
    return { ok: false, locked: true, retryAfter: adminLockRetryAfterSec(ip) };
  }

  if (safeEqual(password, admin)) {
    clearIpFailures(ip);

    return { ok: true, locked: false, retryAfter: 0 };
  }

  recordAdminFailure(ip);

  return { ok: false, locked: false, retryAfter: 0 };
}

// ---------------------------------------------------------------------------
// Dynamic Client Registration (RFC 7591)
// ---------------------------------------------------------------------------
export type ClientRow = {
  client_id: string;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[];
};

export type RegisterInput = {
  client_name?: string;
  redirect_uris: string[];
};

export async function registerClient(
  input: RegisterInput,
): Promise<{ ok: true; client: ClientRow } | { ok: false; error: string }> {
  const uris = input.redirect_uris;

  if (!Array.isArray(uris) || uris.length === 0) {
    return { ok: false, error: "redirect_uris required" };
  }

  if (!uris.every((u) => typeof u === "string" && redirectUriRegistrable(u))) {
    return { ok: false, error: "invalid redirect_uri" };
  }

  const clientId = newClientId();
  const name = typeof input.client_name === "string" ? input.client_name.slice(0, 200) : null;

  await sql`
    INSERT INTO _ops.oauth_clients (client_id, client_name, redirect_uris)
    VALUES (${clientId}, ${name}, ${uris})
  `;

  return {
    ok: true,
    client: {
      client_id: clientId,
      client_name: name,
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
    },
  };
}

export async function getClient(clientId: string): Promise<ClientRow | null> {
  const rows = await sql<ClientRow[]>`
    SELECT client_id, client_name, redirect_uris, grant_types
    FROM _ops.oauth_clients
    WHERE client_id = ${clientId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

/** Validate the /authorize request against the registered client and
 *  return the redirect_uri to use, or an error. */
export async function validateAuthorizeClient(
  clientId: string,
  redirectUri: string,
): Promise<{ ok: true; client: ClientRow } | { ok: false; error: string }> {
  const client = await getClient(clientId);

  if (!client) return { ok: false, error: "unknown client_id" };

  if (!redirectUriAllowed(client.redirect_uris, redirectUri)) {
    return { ok: false, error: "redirect_uri mismatch" };
  }

  return { ok: true, client };
}

// ---------------------------------------------------------------------------
// Authorization codes (PKCE)
// ---------------------------------------------------------------------------
export type IssueCodeInput = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
  resource?: string;
};

export async function issueAuthCode(input: IssueCodeInput): Promise<string> {
  const code = newAuthCode();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS);
  const scope = scopeToArray(input.scope).join(" ");

  await sql`
    INSERT INTO _ops.oauth_codes
      (code_hash, client_id, redirect_uri, code_challenge, scope, resource, expires_at)
    VALUES (
      ${codeHash}, ${input.clientId}, ${input.redirectUri},
      ${input.codeChallenge}, ${scope}, ${input.resource ?? null}, ${expiresAt}
    )
  `;

  return code;
}

export type ConsumedCode = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  resource: string | null;
};

/** Atomically consume an auth code: marks consumed_at in the same UPDATE
 *  that reads it, so a concurrent replay finds nothing. Returns null on
 *  miss / already-consumed / expired. */
export async function consumeAuthCode(code: string): Promise<ConsumedCode | null> {
  const codeHash = await sha256Hex(code);
  const rows = await sql<ConsumedCode[]>`
    UPDATE _ops.oauth_codes
    SET consumed_at = now()
    WHERE code_hash = ${codeHash}
      AND consumed_at IS NULL
      AND expires_at > now()
    RETURNING client_id, redirect_uri, code_challenge, scope, resource
  `;

  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Token issuance
// ---------------------------------------------------------------------------
export type TokenSet = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

/** Mint an access token (api_keys row) + refresh token for a client.
 *  Scope is forced down to the read-only issued set regardless of input. */
export async function issueTokenSet(args: {
  clientId: string;
  scope?: string;
  resource?: string | null;
}): Promise<TokenSet> {
  const scopes = scopeToArray(args.scope);
  const scopeStr = scopes.join(" ");
  const accessToken = newAccessToken();
  const refreshToken = newRefreshToken();
  const accessHash = await sha256Hex(accessToken);
  const refreshHash = await sha256Hex(refreshToken);
  const ttl = env.OAUTH_TOKEN_TTL;
  const accessExpiry = new Date(Date.now() + ttl * 1000);
  const refreshExpiry = new Date(Date.now() + REFRESH_TTL_SEC * 1000);
  const name = `oauth:${args.clientId}`;

  await sql.begin(async (tx) => {
    const [key] = await tx<{ id: string }[]>`
      INSERT INTO _ops.api_keys (key_hash, name, machine_id, scopes, expires_at)
      VALUES (${accessHash}, ${name}, ${null}, ${scopes}, ${accessExpiry})
      RETURNING id
    `;

    await tx`
      INSERT INTO _ops.oauth_refresh
        (token_hash, client_id, api_key_id, scope, resource, expires_at)
      VALUES (
        ${refreshHash}, ${args.clientId}, ${key!.id},
        ${scopeStr}, ${args.resource ?? null}, ${refreshExpiry}
      )
    `;
    await tx`UPDATE _ops.oauth_clients SET last_used_at = now() WHERE client_id = ${args.clientId}`;
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ttl,
    refresh_token: refreshToken,
    scope: scopeStr || ISSUED_SCOPE,
  };
}

/** Rotate a refresh token: validate, revoke the old (and drop its
 *  access-token row), then issue a fresh set. Returns null on a bad /
 *  expired / revoked refresh token. */
export async function refreshTokenSet(
  refreshToken: string,
  clientId: string,
): Promise<TokenSet | null> {
  const refreshHash = await sha256Hex(refreshToken);
  const rows = await sql<
    { client_id: string; api_key_id: string | null; scope: string; resource: string | null }[]
  >`
    SELECT client_id, api_key_id, scope, resource
    FROM _ops.oauth_refresh
    WHERE token_hash = ${refreshHash}
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1
  `;
  const row = rows[0];

  if (!row || row.client_id !== clientId) return null;

  // Single-use rotation: revoke this refresh + delete its access key in
  // one txn so a replay is dead even if the new issuance races.
  await sql.begin(async (tx) => {
    await tx`UPDATE _ops.oauth_refresh SET revoked_at = now() WHERE token_hash = ${refreshHash}`;

    if (row.api_key_id) {
      await tx`DELETE FROM _ops.api_keys WHERE id = ${row.api_key_id}`;
    }
  });

  return issueTokenSet({ clientId, scope: row.scope, resource: row.resource });
}
