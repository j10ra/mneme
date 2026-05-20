// Runtime OAuth resolver tests.
//
// Covers the behavior that makes credentials.json authoritative for the
// SDK subprocess spawn — namely, stripping a stale CLAUDE_CODE_OAUTH_TOKEN
// off process.env so the subprocess reads the live credentials file.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasValidCredentialsToken, resolveOauthEnv } from "../src/agents/auth.ts";

const ENV_KEYS = ["CLAUDE_CODE_OAUTH_TOKEN", "MNEME_CREDENTIALS_PATH"] as const;
let originalEnv: Record<string, string | undefined>;
let tmp: string;

beforeEach(() => {
  originalEnv = {};
  for (const k of ENV_KEYS) {
    originalEnv[k] = process.env[k];
    delete process.env[k];
  }
  tmp = mkdtempSync(join(tmpdir(), "mneme-auth-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  for (const k of ENV_KEYS) {
    if (originalEnv[k] === undefined) delete process.env[k];
    else process.env[k] = originalEnv[k];
  }
});

function writeCredentials(token: string, expiresAt: number | undefined): string {
  const path = join(tmp, "credentials.json");
  writeFileSync(
    path,
    JSON.stringify({
      claudeAiOauth: { accessToken: token, ...(expiresAt !== undefined ? { expiresAt } : {}) },
    }),
  );
  return path;
}

describe("hasValidCredentialsToken", () => {
  test("returns false when the credentials file is missing", () => {
    process.env.MNEME_CREDENTIALS_PATH = join(tmp, "nope.json");
    expect(hasValidCredentialsToken()).toBe(false);
  });

  test("returns true with a fresh (future-expiry) accessToken", () => {
    process.env.MNEME_CREDENTIALS_PATH = writeCredentials("tok", Date.now() + 60 * 60_000);
    expect(hasValidCredentialsToken()).toBe(true);
  });

  test("returns false when expiresAt is within the 60s safety margin", () => {
    process.env.MNEME_CREDENTIALS_PATH = writeCredentials("tok", Date.now() + 30_000);
    expect(hasValidCredentialsToken()).toBe(false);
  });

  test("returns true when expiresAt is absent (treats as long-lived)", () => {
    process.env.MNEME_CREDENTIALS_PATH = writeCredentials("tok", undefined);
    expect(hasValidCredentialsToken()).toBe(true);
  });

  test("returns false on malformed JSON", () => {
    const path = join(tmp, "credentials.json");
    writeFileSync(path, "{ not json");
    process.env.MNEME_CREDENTIALS_PATH = path;
    expect(hasValidCredentialsToken()).toBe(false);
  });
});

describe("resolveOauthEnv", () => {
  test("returns 'credentials' AND strips CLAUDE_CODE_OAUTH_TOKEN when credentials.json is valid", () => {
    process.env.MNEME_CREDENTIALS_PATH = writeCredentials("fresh", Date.now() + 60 * 60_000);
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "stale-baked-in";
    expect(resolveOauthEnv()).toBe("credentials");
    expect(process.env.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
  });

  test("returns 'env' when credentials.json is missing but the env var is set", () => {
    process.env.MNEME_CREDENTIALS_PATH = join(tmp, "nope.json");
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "long-lived";
    expect(resolveOauthEnv()).toBe("env");
    expect(process.env.CLAUDE_CODE_OAUTH_TOKEN).toBe("long-lived");
  });

  test("returns 'none' when neither source provides a token", () => {
    process.env.MNEME_CREDENTIALS_PATH = join(tmp, "nope.json");
    expect(resolveOauthEnv()).toBe("none");
  });

  test("expired credentials don't strip a valid env-var fallback", () => {
    process.env.MNEME_CREDENTIALS_PATH = writeCredentials("expired", Date.now() - 60_000);
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "long-lived";
    expect(resolveOauthEnv()).toBe("env");
    expect(process.env.CLAUDE_CODE_OAUTH_TOKEN).toBe("long-lived");
  });
});
