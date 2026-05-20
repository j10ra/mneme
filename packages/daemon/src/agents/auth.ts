// Runtime OAuth resolver for the Claude SDK subprocess.
//
// Priority:
//   1. ~/.claude/.credentials.json — primary. Auto-rotated by the `claude`
//      CLI itself, so the daemon stays in lockstep with interactive
//      sessions without re-baking tokens into systemd/launchd.
//   2. CLAUDE_CODE_OAUTH_TOKEN env var — fallback. Long-lived user token
//      exported in shell rc files; used only when credentials.json is
//      absent or expired.
//
// The SDK's spawned `claude` subprocess inherits process.env. If
// CLAUDE_CODE_OAUTH_TOKEN is set, the subprocess uses it directly and
// skips credentials.json — which previously created a stale-token trap
// when an install-time token was baked into the systemd unit but the
// interactive `claude` had since rotated. To make credentials.json
// authoritative we strip the env var from the daemon process before
// each subprocess spawn; the subprocess then reads the file natively.
//
// The credentialsPath() seam exists so tests can point at a fixture
// without touching the real ~/.claude/ tree.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type CredentialsFile = {
  claudeAiOauth?: {
    accessToken?: string;
    expiresAt?: number;
  };
};

// Treat a credentials token as valid only when it has at least this much
// life left. The subprocess refreshes the file on demand; this margin
// keeps us from handing the SDK a token that'll expire mid-extract.
const VALIDITY_MARGIN_MS = 60_000;

function credentialsPath(): string {
  return process.env.MNEME_CREDENTIALS_PATH ?? join(homedir(), ".claude", ".credentials.json");
}

export type AuthSource = "credentials" | "env" | "none";

export function hasValidCredentialsToken(): boolean {
  const p = credentialsPath();
  if (!existsSync(p)) return false;
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as CredentialsFile;
    const token = raw.claudeAiOauth?.accessToken;
    if (!token) return false;
    const exp = raw.claudeAiOauth?.expiresAt;
    if (typeof exp === "number" && exp - Date.now() < VALIDITY_MARGIN_MS) return false;
    return true;
  } catch {
    return false;
  }
}

/** Align process.env with the credentials-first priority and return the
 *  active source. Called immediately before spawning a new SDK
 *  subprocess so rotated tokens land in the next session. */
export function resolveOauthEnv(): AuthSource {
  if (hasValidCredentialsToken()) {
    if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    }
    return "credentials";
  }
  return process.env.CLAUDE_CODE_OAUTH_TOKEN ? "env" : "none";
}
