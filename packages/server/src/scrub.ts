// Edge scrubber: redacts secrets and <private>...</private> blocks before
// content is hashed, stored, or recorded as span input/output.

type Pattern = { name: string; re: RegExp };

// Order matters: more specific patterns first so they win the replace race.
const SECRET_PATTERNS: Pattern[] = [
  { name: "aws_access_key", re: /AKIA[0-9A-Z]{16}/g },
  { name: "github_pat_classic", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g },
  { name: "github_pat_fine", re: /\bgithub_pat_[A-Za-z0-9_]{82,}\b/g },
  { name: "anthropic_key", re: /\bsk-ant-(?:api\d{2}-)?[A-Za-z0-9_-]{40,}\b/g },
  { name: "openai_key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/g },
  { name: "groq_key", re: /\bgsk_[A-Za-z0-9]{40,}\b/g },
  { name: "voyage_key", re: /\bpa-[A-Za-z0-9_-]{40,}\b/g },
  { name: "slack_token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "jwt", re: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
  { name: "bearer_header", re: /\b[Bb]earer\s+[A-Za-z0-9_\-.=]{20,}/g },
  {
    name: "ssh_private_key",
    re: /-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*?-----END[A-Z ]*PRIVATE KEY-----/g,
  },
  // URL userinfo: `https://user:token@host/...` or `git://user:pat@host`.
  // The capture path explicitly comments that credentials embedded in repo
  // URLs (`user:token@host`) flow through scrub, so the regex set must
  // actually catch them. Lookbehind on the scheme so only the `user:pass`
  // segment is redacted; scheme and host stay readable.
  {
    name: "url_userinfo",
    re: /(?<=\b[a-zA-Z][a-zA-Z0-9+.-]{0,30}:\/\/)[^\s/@:]+:[^\s/@]+(?=@)/g,
  },
];

const PRIVATE_TAG_RE = /<private[^>]*>[\s\S]*?<\/private>/gi;

/** Scrub a string. Returns the string with secrets and <private> blocks redacted. */
export function scrub(input: string): string {
  if (!input) return input;
  let out = input.replace(PRIVATE_TAG_RE, "[private redacted]");
  for (const { name, re } of SECRET_PATTERNS) {
    out = out.replace(re, `[REDACTED:${name}]`);
  }
  return out;
}

/** Recursive scrubber for arbitrary JSON-like values (TraceStore.Scrubber shape). */
export function scrubData(data: unknown): unknown {
  if (typeof data === "string") return scrub(data);
  if (Array.isArray(data)) return data.map(scrubData);
  if (data && typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = scrubData(v);
    }
    return out;
  }
  return data;
}
