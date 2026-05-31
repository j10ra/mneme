-- OAuth 2.1 + PKCE + Dynamic Client Registration for the remote MCP
-- endpoint (#59). Lets any MCP client (Claude desktop/web/mobile,
-- ChatGPT, local LLMs) connect to /mcp with just the server URL and
-- obtain a READ-ONLY access token through the standard authorization
-- flow. The custom-connector dialog on every Claude surface accepts
-- only OAuth or no-auth — there is no static-Bearer field — so this is
-- the only path that works cross-surface and for other self-hosters.
--
-- Issued access tokens are ordinary _ops.api_keys rows scoped to
-- {read,mcp} (never `capture`); read-only is enforced again by the
-- mneme_reader DB role the /mcp tool runs under. Single-owner model:
-- the resource owner authenticates at /authorize with ADMIN_PASSWORD.
--
-- These tables live in _ops, where mneme_reader has no privilege, so no
-- grants are issued here.

-- Dynamically-registered public clients (RFC 7591). No client secret;
-- security comes from PKCE + exact redirect_uri match.
CREATE TABLE IF NOT EXISTS _ops.oauth_clients (
  client_id      TEXT PRIMARY KEY,
  client_name    TEXT,
  redirect_uris  TEXT[] NOT NULL,
  grant_types    TEXT[] NOT NULL DEFAULT '{authorization_code,refresh_token}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at   TIMESTAMPTZ
);

-- Short-lived authorization codes, stored hashed. One-shot: consumed_at
-- is stamped on first exchange so a replay is rejected.
CREATE TABLE IF NOT EXISTS _ops.oauth_codes (
  code_hash             TEXT PRIMARY KEY,
  client_id             TEXT NOT NULL REFERENCES _ops.oauth_clients (client_id) ON DELETE CASCADE,
  redirect_uri          TEXT NOT NULL,
  code_challenge        TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  scope                 TEXT NOT NULL,
  resource              TEXT,
  expires_at            TIMESTAMPTZ NOT NULL,
  consumed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oauth_codes_expiry_idx ON _ops.oauth_codes (expires_at);

-- Refresh tokens (hashed), long-lived. api_key_id points at the most
-- recently issued access-token row so revoking the refresh token can
-- also drop the live access token; ON DELETE SET NULL keeps the refresh
-- row alive when an access token simply expires and is swept.
CREATE TABLE IF NOT EXISTS _ops.oauth_refresh (
  token_hash   TEXT PRIMARY KEY,
  client_id    TEXT NOT NULL REFERENCES _ops.oauth_clients (client_id) ON DELETE CASCADE,
  api_key_id   UUID REFERENCES _ops.api_keys (id) ON DELETE SET NULL,
  scope        TEXT NOT NULL,
  resource     TEXT,
  expires_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oauth_refresh_apikey_idx ON _ops.oauth_refresh (api_key_id);
