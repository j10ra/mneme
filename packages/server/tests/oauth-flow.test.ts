// Full OAuth flow against the DB (#59): register → authorize code →
// PKCE-checked token exchange → token actually authenticates as a
// read-only key → refresh rotation. Skips without DATABASE_URL and
// cleans up every row it creates.

import { afterAll, describe, expect, test } from "bun:test";
import { base64url, sha256 } from "../src/lib/oauth.ts";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("oauth full flow (requires DATABASE_URL)", () => {
  const clientIds: string[] = [];

  afterAll(async () => {
    if (clientIds.length === 0) return;
    const { sql } = await import("../src/infra/db.ts");

    // Access-token rows are named oauth:<client_id>; clients cascade to
    // codes + refresh tokens.
    const names = clientIds.map((id) => `oauth:${id}`);

    await sql`DELETE FROM _ops.api_keys WHERE name = ANY(${names})`;
    await sql`DELETE FROM _ops.oauth_clients WHERE client_id = ANY(${clientIds})`;
  });

  test("register → code → token → authenticate → refresh", async () => {
    // Many sequential round-trips to a remote (Railway) Postgres.
    const oauth = await import("../src/services/oauth.ts");
    const { sql, sha256Hex } = await import("../src/infra/db.ts");

    // 1. Dynamic client registration.
    const redirectUri = `http://localhost:9999/cb-${crypto.randomUUID()}`;
    const reg = await oauth.registerClient({
      client_name: "test-client",
      redirect_uris: [redirectUri],
    });

    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    const clientId = reg.client.client_id;

    clientIds.push(clientId);

    // 2. PKCE pair (verifier → S256 challenge).
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = base64url(await sha256(verifier));

    // 3. Authorization code issuance + one-shot consumption.
    const code = await oauth.issueAuthCode({
      clientId,
      redirectUri,
      codeChallenge: challenge,
      scope: "read mcp capture", // capture must be stripped
    });
    const consumed = await oauth.consumeAuthCode(code);

    expect(consumed).not.toBeNull();
    expect(consumed!.client_id).toBe(clientId);
    expect(consumed!.code_challenge).toBe(challenge);
    expect(consumed!.scope).toBe("read mcp"); // capture dropped

    // Replay is dead.
    expect(await oauth.consumeAuthCode(code)).toBeNull();

    // 4. Token issuance — read-only key, no capture scope.
    const tokens = await oauth.issueTokenSet({ clientId, scope: consumed!.scope });

    expect(tokens.access_token).toMatch(/^mneme_oauth_/);
    expect(tokens.refresh_token).toMatch(/^mneme_refresh_/);
    expect(tokens.token_type).toBe("Bearer");
    expect(tokens.scope).toBe("read mcp");

    // 5. The access token resolves to a real api_keys row with mcp scope,
    //    an expiry, and NO capture privilege.
    const accessHash = await sha256Hex(tokens.access_token);
    const [key] = await sql<
      { scopes: string[]; expires_at: string | null; machine_id: string | null }[]
    >`
      SELECT scopes, expires_at, machine_id FROM _ops.api_keys WHERE key_hash = ${accessHash} LIMIT 1
    `;

    expect(key).toBeDefined();
    expect(key!.scopes).toContain("mcp");
    expect(key!.scopes).toContain("read");
    expect(key!.scopes).not.toContain("capture");
    expect(key!.expires_at).not.toBeNull();
    expect(key!.machine_id).toBeNull();

    // 6. Refresh rotation: new tokens, old refresh now dead.
    const refreshed = await oauth.refreshTokenSet(tokens.refresh_token, clientId);

    expect(refreshed).not.toBeNull();
    expect(refreshed!.access_token).not.toBe(tokens.access_token);
    expect(await oauth.refreshTokenSet(tokens.refresh_token, clientId)).toBeNull();

    // Wrong client_id is rejected on the fresh refresh token too.
    expect(await oauth.refreshTokenSet(refreshed!.refresh_token, "not-the-client")).toBeNull();
  }, 30_000);

  test("revokeClient cuts off a client's tokens (#59 M3)", async () => {
    const oauth = await import("../src/services/oauth.ts");
    const { sql, sha256Hex } = await import("../src/infra/db.ts");

    const reg = await oauth.registerClient({
      client_name: "revoke-me",
      redirect_uris: [`http://localhost:9998/cb-${crypto.randomUUID()}`],
    });

    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    const clientId = reg.client.client_id;

    clientIds.push(clientId);

    const tokens = await oauth.issueTokenSet({ clientId, scope: "read mcp" });
    const accessHash = await sha256Hex(tokens.access_token);

    // Listed as active before revoke.
    const before = (await oauth.listClients()).find((c) => c.client_id === clientId);

    expect(before?.active_tokens).toBeGreaterThanOrEqual(1);

    const result = await oauth.revokeClient(clientId);

    expect(result.tokens).toBeGreaterThanOrEqual(1);
    expect(result.client).toBe(1);

    // Access token row gone, client gone, refresh cascaded.
    const keyRows = await sql`SELECT 1 FROM _ops.api_keys WHERE key_hash = ${accessHash}`;

    expect(keyRows.length).toBe(0);
    expect((await oauth.listClients()).some((c) => c.client_id === clientId)).toBe(false);
    expect(await oauth.refreshTokenSet(tokens.refresh_token, clientId)).toBeNull();
  }, 30_000);
});
