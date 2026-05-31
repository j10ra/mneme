# OAuth for the remote MCP connector

Mneme's `/mcp` endpoint authenticates with a static per-machine Bearer token (minted at `/mneme:setup`). That works for Claude Code, where the local proxy injects the header. It does **not** work for the custom-connector dialog on Claude desktop / web / mobile, ChatGPT, or any other MCP client: that dialog accepts **OAuth or no-auth only** — there is no field for a static token.

So the server also speaks **OAuth 2.1 + PKCE + Dynamic Client Registration** (#59). Any MCP client can plug Mneme in as a **read-only memory tool** using just the server URL. Chat surfaces have no capture hooks, so this is read-only by nature — they read what the agent harnesses (Claude Code, pi) wrote.

## Connecting a client

Paste the server URL (e.g. `https://<host>/mcp`) into the client's "add custom connector" / remote-MCP field. Leave any OAuth client ID/secret blank. The client then:

1. Hits `/mcp`, gets `401` with `WWW-Authenticate: Bearer resource_metadata="…"`.
2. Reads `/.well-known/oauth-protected-resource` → finds the authorization server.
3. Reads `/.well-known/oauth-authorization-server` → discovers the endpoints.
4. Self-registers at `POST /register` (no secret; public client + PKCE).
5. Opens `/authorize` in a browser → **you enter the admin password** (`ADMIN_PASSWORD`).
6. Exchanges the code at `POST /token` (PKCE S256 verified) for an access + refresh token.
7. Calls `/mcp` with the Bearer access token.

## What you get is read-only — twice over

- Issued tokens are `_ops.api_keys` rows scoped `{read,mcp}` only — never `capture`. The scope is forced down server-side regardless of what the client requests.
- The `mneme_sql` tool runs every query as the `mneme_reader` Postgres role (SELECT-only, RLS `private = false`). Even a token that somehow carried more scope physically cannot write or read private rows.

## Single owner per deployment

Mneme is one user across N machines. The OAuth resource owner is the deployment admin, authenticated at `/authorize` with `ADMIN_PASSWORD` (reusing the same brute-force throttle as the admin bearer). "Other people" means other self-hosters — each runs their own deployment and is their own owner. There is no multi-tenancy within one deployment.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/.well-known/oauth-protected-resource[/mcp]` | RFC 9728 resource metadata |
| GET | `/.well-known/oauth-authorization-server[/mcp]` | RFC 8414 AS metadata |
| POST | `/register` | RFC 7591 Dynamic Client Registration |
| GET/POST | `/authorize` | owner login → authorization code |
| POST | `/token` | `authorization_code` + `refresh_token` grants |

## Config

- `ADMIN_PASSWORD` (required, already used) — the owner login at `/authorize`.
- `PUBLIC_URL` (optional) — canonical issuer origin in discovery metadata. Unset → derived from the request origin (works behind Railway's proxy). Pin it when fronted by a custom domain or reachable on multiple hostnames.
- `OAUTH_TOKEN_TTL` (optional, default 90d) — access-token lifetime in seconds; refresh tokens renew silently.

## Tables (migration `0031_oauth.sql`)

- `_ops.oauth_clients` — DCR registrations (public clients, exact-match redirect URIs).
- `_ops.oauth_codes` — short-lived (60s) one-shot PKCE authorization codes, stored hashed.
- `_ops.oauth_refresh` — refresh tokens (hashed), rotated single-use on every refresh.

Access tokens reuse `_ops.api_keys` (`name = oauth:<client_id>`, `expires_at` set). All three tables live in `_ops`, where `mneme_reader` has no privilege.

## Code

- Pure helpers (PKCE verify, encoding, metadata): [`packages/server/src/lib/oauth.ts`](../packages/server/src/lib/oauth.ts)
- DB logic (register, codes, token issuance/refresh, owner check): [`packages/server/src/services/oauth.ts`](../packages/server/src/services/oauth.ts)
- HTTP routes + login page: [`packages/server/src/routes/oauth.ts`](../packages/server/src/routes/oauth.ts)
- Discovery `401` challenge on `/mcp`: [`packages/core/src/auth.ts`](../packages/core/src/auth.ts)
