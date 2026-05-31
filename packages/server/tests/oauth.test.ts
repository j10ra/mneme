// Pure-helper tests for the OAuth 2.1 layer (#59). The DB-touching
// service is exercised by the full-flow integration test; here we lock
// the security-critical pure functions: PKCE S256 verification,
// base64url, redirect-uri matching, and the discovery metadata shape.

import { describe, expect, test } from "bun:test";
import {
  authServerMetadata,
  base64url,
  protectedResourceMetadata,
  redirectUriAllowed,
  redirectUriRegistrable,
  scopeToArray,
  sha256hex,
  verifyPkceS256,
} from "../src/lib/oauth.ts";

describe("base64url", () => {
  test("encodes without padding and url-safe alphabet", () => {
    expect(base64url(new Uint8Array([255, 255, 255]))).toBe("____");
    expect(base64url(new Uint8Array([251, 255, 191]))).toBe("-_-_");
    expect(base64url(new Uint8Array([0]))).toBe("AA");
  });
});

describe("verifyPkceS256", () => {
  // RFC 7636 Appendix B canonical vector.
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

  test("accepts the matching verifier", async () => {
    expect(await verifyPkceS256(verifier, challenge)).toBe(true);
  });

  test("rejects a wrong verifier", async () => {
    expect(await verifyPkceS256(`${verifier}x`, challenge)).toBe(false);
  });

  test("rejects empty inputs", async () => {
    expect(await verifyPkceS256("", challenge)).toBe(false);
    expect(await verifyPkceS256(verifier, "")).toBe(false);
  });
});

describe("sha256hex", () => {
  test("matches the known empty-string digest", async () => {
    expect(await sha256hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

describe("redirectUriRegistrable", () => {
  test("allows https, loopback http, and native custom schemes", () => {
    expect(redirectUriRegistrable("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(redirectUriRegistrable("http://localhost:8765/cb")).toBe(true);
    expect(redirectUriRegistrable("http://127.0.0.1/cb")).toBe(true);
    expect(redirectUriRegistrable("com.example.app:/oauth")).toBe(true);
  });

  test("rejects non-loopback plaintext http and garbage", () => {
    expect(redirectUriRegistrable("http://evil.example.com/cb")).toBe(false);
    expect(redirectUriRegistrable("not a url")).toBe(false);
    expect(redirectUriRegistrable("")).toBe(false);
  });
});

describe("redirectUriAllowed", () => {
  const registered = ["https://claude.ai/api/mcp/auth_callback", "http://localhost:1/cb"];

  test("requires exact match", () => {
    expect(redirectUriAllowed(registered, "https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(redirectUriAllowed(registered, "https://claude.ai/api/mcp/auth_callback/")).toBe(false);
    expect(redirectUriAllowed(registered, "https://evil.test/cb")).toBe(false);
  });
});

describe("scopeToArray", () => {
  test("splits on whitespace and drops empties", () => {
    expect(scopeToArray("read mcp")).toEqual(["read", "mcp"]);
    expect(scopeToArray("  read   mcp ")).toEqual(["read", "mcp"]);
  });

  test("never yields capture even if asked", () => {
    expect(scopeToArray("read mcp capture")).not.toContain("capture");
  });
});

describe("metadata builders", () => {
  const issuer = "https://mneme.example.app";

  test("authorization-server metadata advertises PKCE + public client", () => {
    const m = authServerMetadata(issuer);

    expect(m.issuer).toBe(issuer);
    expect(m.authorization_endpoint).toBe(`${issuer}/authorize`);
    expect(m.token_endpoint).toBe(`${issuer}/token`);
    expect(m.registration_endpoint).toBe(`${issuer}/register`);
    expect(m.code_challenge_methods_supported).toEqual(["S256"]);
    expect(m.token_endpoint_auth_methods_supported).toEqual(["none"]);
    expect(m.grant_types_supported).toContain("refresh_token");
  });

  test("protected-resource metadata points back at the issuer", () => {
    const m = protectedResourceMetadata(issuer, `${issuer}/mcp`);

    expect(m.resource).toBe(`${issuer}/mcp`);
    expect(m.authorization_servers).toEqual([issuer]);
  });
});
