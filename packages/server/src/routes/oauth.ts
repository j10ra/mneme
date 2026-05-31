// OAuth 2.1 + PKCE + Dynamic Client Registration HTTP surface (#59).
// Lets any MCP client connect to /mcp with just the server URL and
// obtain a read-only access token. Provider-agnostic: standard
// discovery metadata, public client + PKCE (S256), no client secret.
//
// Endpoints:
//   GET  /.well-known/oauth-authorization-server[/mcp]   RFC 8414
//   GET  /.well-known/oauth-protected-resource[/mcp]     RFC 9728
//   POST /register                                       RFC 7591 DCR
//   GET  /authorize  → owner login form (ADMIN_PASSWORD)
//   POST /authorize  → issue code, redirect back
//   POST /token      → authorization_code | refresh_token grant
//
// The /authorize HTML is the only HTML this server serves; its CSP is
// relaxed in index.ts (everything else stays default-src 'none').

import type { Context, Hono } from "hono";
import { Logger, mnemeRoute, requireAuth } from "@mneme/core";
import { clientIp } from "@mneme/core/auth-throttle";
import { authServerMetadata, protectedResourceMetadata, verifyPkceS256 } from "../lib/oauth.ts";
import { publicOrigin } from "../lib/origin.ts";
import {
  consumeAuthCode,
  issueAuthCode,
  issueTokenSet,
  listClients,
  refreshTokenSet,
  registerClient,
  revokeClient,
  validateAuthorizeClient,
  verifyOwnerPassword,
} from "../services/oauth.ts";

// Issuer = canonical public origin (see lib/origin.ts). Trailing slash
// already stripped there, so paths concatenate clean.
const issuerOf = publicOrigin;

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Read params from urlencoded form OR JSON body (token/register clients
// vary). Query params merged in for good measure.
async function readParams(c: Context): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const ct = c.req.header("content-type") ?? "";

  if (ct.includes("application/json")) {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

    if (body) for (const [k, v] of Object.entries(body)) out[k] = String(v);
  } else {
    const body = await c.req.parseBody().catch(() => ({}));

    for (const [k, v] of Object.entries(body)) if (typeof v === "string") out[k] = v;
  }

  return out;
}

function oauthError(c: Context, error: string, description: string, status = 400) {
  c.header("Cache-Control", "no-store");

  return c.json({ error, error_description: description }, status as 400);
}

// Append params to a redirect_uri, respecting any existing query string.
function redirectWith(base: string, params: Record<string, string>): string {
  const u = new URL(base);

  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);

  return u.toString();
}

type Consent = { clientName: string | null; redirectUri: string };

function loginPage(
  issuer: string,
  hidden: Record<string, string>,
  consent: Consent,
  errorMsg?: string,
): string {
  const fields = Object.entries(hidden)
    .map(([k, v]) => `<input type="hidden" name="${escapeAttr(k)}" value="${escapeAttr(v)}">`)
    .join("\n      ");
  const banner = errorMsg ? `<p class="err">${escapeAttr(errorMsg)}</p>` : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mneme — authorize</title>
  <style>
    body { font: 15px/1.5 system-ui, sans-serif; background: #111; color: #eee;
           display: grid; place-items: center; min-height: 100vh; margin: 0; }
    form { background: #1b1b1b; padding: 2rem; border-radius: 12px; width: 320px;
           box-shadow: 0 8px 40px rgba(0,0,0,.5); }
    h1 { font-size: 1.1rem; margin: 0 0 .25rem; }
    p.sub { color: #999; margin: 0 0 1rem; font-size: .85rem; }
    p.err { color: #ff6b6b; font-size: .85rem; margin: 0 0 1rem; }
    .grant { background: #111; border: 1px solid #333; border-radius: 8px;
             padding: .75rem .85rem; margin: 0 0 1rem; font-size: .8rem; }
    .grant div { display: flex; justify-content: space-between; gap: 1rem; }
    .grant div + div { margin-top: .4rem; }
    .grant span { color: #888; }
    .grant b { color: #eee; word-break: break-all; text-align: right; }
    .warn { color: #e0a060; font-size: .8rem; margin: 0 0 1rem; }
    input[type=password] { width: 100%; box-sizing: border-box; padding: .6rem .7rem;
           border: 1px solid #333; border-radius: 8px; background: #111; color: #eee;
           margin-bottom: 1rem; }
    button { width: 100%; padding: .65rem; border: 0; border-radius: 8px;
             background: #d97757; color: #fff; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <form method="post" action="${escapeAttr(issuer)}/authorize">
    <h1>Connect to Mneme</h1>
    <p class="sub">This client is requesting <strong>read-only</strong> access to your memory:</p>
    <div class="grant">
      <div><span>Client</span><b>${escapeAttr(consent.clientName || "(unnamed client)")}</b></div>
      <div><span>Redirects to</span><b>${escapeAttr(consent.redirectUri)}</b></div>
    </div>
    <p class="warn">Only continue if you started this connection. The redirect above is where your access code is sent.</p>
    ${banner}
    ${fields}
    <input type="password" name="password" placeholder="Admin password" autofocus required>
    <button type="submit">Authorize</button>
  </form>
</body>
</html>`;
}

export function mountOAuthRoutes(app: Hono): void {
  // ── Discovery metadata (bare + /mcp-suffixed variants) ─────────────
  const authMeta = (c: Context) => {
    // no-store: the issuer is derived per-request (PUBLIC_URL or
    // X-Forwarded-*), so a shared cache must never serve one client's
    // (possibly host-spoofed) metadata to another. #59 hardening.
    c.header("Cache-Control", "no-store");

    return c.json(authServerMetadata(issuerOf(c)));
  };

  const resourceMeta = (c: Context) => {
    const issuer = issuerOf(c);

    // no-store: the issuer is derived per-request (PUBLIC_URL or
    // X-Forwarded-*), so a shared cache must never serve one client's
    // (possibly host-spoofed) metadata to another. #59 hardening.
    c.header("Cache-Control", "no-store");

    return c.json(protectedResourceMetadata(issuer, `${issuer}/mcp`));
  };

  app.get("/.well-known/oauth-authorization-server", mnemeRoute("oauth.meta.as"), authMeta);
  app.get("/.well-known/oauth-authorization-server/mcp", mnemeRoute("oauth.meta.as"), authMeta);
  app.get("/.well-known/oauth-protected-resource", mnemeRoute("oauth.meta.pr"), resourceMeta);
  app.get("/.well-known/oauth-protected-resource/mcp", mnemeRoute("oauth.meta.pr"), resourceMeta);

  // ── Dynamic Client Registration (RFC 7591) ─────────────────────────
  app.post("/register", mnemeRoute("oauth.register"), async (c) => {
    const body = (await c.req.json().catch(() => null)) as {
      client_name?: unknown;
      redirect_uris?: unknown;
    } | null;
    const redirectUris = Array.isArray(body?.redirect_uris)
      ? (body!.redirect_uris as unknown[])
      : [];
    const result = await registerClient({
      client_name: typeof body?.client_name === "string" ? body.client_name : undefined,
      redirect_uris: redirectUris.filter((u): u is string => typeof u === "string"),
    });

    if (!result.ok) return oauthError(c, "invalid_client_metadata", result.error);

    c.header("Cache-Control", "no-store");

    return c.json(
      {
        client_id: result.client.client_id,
        client_name: result.client.client_name ?? undefined,
        redirect_uris: result.client.redirect_uris,
        grant_types: result.client.grant_types,
        token_endpoint_auth_method: "none",
      },
      201,
    );
  });

  // ── Authorization endpoint ──────────────────────────────────────────
  // GET renders the owner-login form; POST verifies the password and
  // redirects back with an authorization code.
  app.get("/authorize", mnemeRoute("oauth.authorize"), async (c) => {
    const q = c.req.query();
    const { client_id, redirect_uri, code_challenge, state, scope, resource } = q;
    const method = q.code_challenge_method ?? "S256";
    const responseType = q.response_type;

    if (!client_id || !redirect_uri) {
      return c.text("missing client_id or redirect_uri", 400);
    }

    const check = await validateAuthorizeClient(client_id, redirect_uri);

    if (!check.ok) return c.text(check.error, 400);

    // Past this point redirect_uri is trusted, so protocol errors go back
    // as redirect error params per OAuth.
    if (responseType !== "code") {
      return c.redirect(
        redirectWith(redirect_uri, { error: "unsupported_response_type", state: state ?? "" }),
      );
    }

    if (method !== "S256" || !code_challenge) {
      return c.redirect(
        redirectWith(redirect_uri, {
          error: "invalid_request",
          error_description: "PKCE S256 required",
          state: state ?? "",
        }),
      );
    }

    const hidden: Record<string, string> = {
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method: "S256",
      response_type: "code",
    };

    if (state) hidden.state = state;
    if (scope) hidden.scope = scope;
    if (resource) hidden.resource = resource;

    return c.html(
      loginPage(issuerOf(c), hidden, {
        clientName: check.client.client_name,
        redirectUri: redirect_uri,
      }),
    );
  });

  app.post("/authorize", mnemeRoute("oauth.authorize.submit"), async (c) => {
    const p = await readParams(c);
    const { client_id, redirect_uri, code_challenge, state, scope, resource, password } = p;

    if (!client_id || !redirect_uri || !code_challenge) {
      return c.text("missing required parameters", 400);
    }

    const check = await validateAuthorizeClient(client_id, redirect_uri);

    if (!check.ok) return c.text(check.error, 400);

    const ip = clientIp((name) => c.req.header(name));
    const owner = verifyOwnerPassword(password ?? "", ip);

    if (!owner.ok) {
      if (owner.locked) {
        c.header("Retry-After", String(owner.retryAfter));
      }

      const hidden: Record<string, string> = {
        client_id,
        redirect_uri,
        code_challenge,
        code_challenge_method: "S256",
        response_type: "code",
      };

      if (state) hidden.state = state;
      if (scope) hidden.scope = scope;
      if (resource) hidden.resource = resource;

      const msg = owner.locked
        ? `Too many attempts. Try again in ${owner.retryAfter}s.`
        : "Incorrect password.";

      return c.html(
        loginPage(
          issuerOf(c),
          hidden,
          { clientName: check.client.client_name, redirectUri: redirect_uri },
          msg,
        ),
        owner.locked ? 429 : 401,
      );
    }

    const code = await issueAuthCode({
      clientId: client_id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      scope,
      resource,
    });

    const params: Record<string, string> = { code };

    if (state) params.state = state;

    return c.redirect(redirectWith(redirect_uri, params));
  });

  // ── Token endpoint ──────────────────────────────────────────────────
  app.post("/token", mnemeRoute("oauth.token"), async (c) => {
    const p = await readParams(c);
    const grant = p.grant_type;

    if (grant === "authorization_code") {
      const { code, code_verifier, client_id, redirect_uri } = p;

      if (!code || !code_verifier || !client_id) {
        return oauthError(c, "invalid_request", "code, code_verifier, client_id required");
      }

      const consumed = await consumeAuthCode(code);

      if (!consumed)
        return oauthError(c, "invalid_grant", "code invalid, expired, or already used");

      if (consumed.client_id !== client_id) {
        return oauthError(c, "invalid_grant", "client_id mismatch");
      }

      if (redirect_uri && redirect_uri !== consumed.redirect_uri) {
        return oauthError(c, "invalid_grant", "redirect_uri mismatch");
      }

      const pkceOk = await verifyPkceS256(code_verifier, consumed.code_challenge);

      if (!pkceOk) return oauthError(c, "invalid_grant", "PKCE verification failed");

      const tokens = await issueTokenSet({
        clientId: client_id,
        scope: consumed.scope,
        resource: consumed.resource,
      });

      c.header("Cache-Control", "no-store");

      return c.json(tokens);
    }

    if (grant === "refresh_token") {
      const { refresh_token, client_id } = p;

      if (!refresh_token || !client_id) {
        return oauthError(c, "invalid_request", "refresh_token, client_id required");
      }

      const tokens = await refreshTokenSet(refresh_token, client_id);

      if (!tokens) return oauthError(c, "invalid_grant", "refresh token invalid or expired");

      c.header("Cache-Control", "no-store");

      return c.json(tokens);
    }

    Logger.warn(`oauth: unsupported grant_type ${grant}`);

    return oauthError(c, "unsupported_grant_type", `grant_type ${grant} not supported`);
  });

  // ── Owner management (admin-gated) ──────────────────────────────────
  // OAuth tokens have machine_id NULL, so /api/auth/revoke (per-machine)
  // can't reach them. These let the owner audit and cut off connectors.
  app.get("/api/oauth/clients", mnemeRoute("oauth.clients"), requireAuth("admin"), async (c) => {
    return c.json({ clients: await listClients() });
  });

  app.post("/api/oauth/revoke", mnemeRoute("oauth.revoke"), requireAuth("admin"), async (c) => {
    const body = (await c.req.json().catch(() => null)) as { client_id?: unknown } | null;
    const clientId =
      typeof body?.client_id === "string" && body.client_id.trim() ? body.client_id.trim() : "";

    if (!clientId) return c.json({ error: "client_id required" }, 400);

    const result = await revokeClient(clientId);

    return c.json({ client_id: clientId, ...result });
  });
}
