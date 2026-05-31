// Edge scrubber: redacts secrets and <private>...</private> blocks before
// content is hashed, stored, written to disk, embedded, or recorded as
// span input/output. Lives in @mneme/shared so both edges (the plugin
// hook + the server) apply identical rules with one source of truth.

type Pattern = { name: string; re: RegExp };

// Order matters: more specific patterns first so they win the replace race.
const SECRET_PATTERNS: Pattern[] = [
  { name: "aws_access_key", re: /AKIA[0-9A-Z]{16}/g },
  {
    name: "github_pat_classic",
    re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g,
  },
  { name: "github_pat_fine", re: /\bgithub_pat_[A-Za-z0-9_]{82,}\b/g },
  { name: "anthropic_key", re: /\bsk-ant-(?:api\d{2}-)?[A-Za-z0-9_-]{40,}\b/g },
  { name: "openai_key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/g },
  { name: "groq_key", re: /\bgsk_[A-Za-z0-9]{40,}\b/g },
  { name: "voyage_key", re: /\bpa-[A-Za-z0-9_-]{40,}\b/g },
  { name: "slack_token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  {
    name: "jwt",
    re: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  },
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

const REDACTED_DATA_PREFIX = "[redacted: ";

/** Scrub a string. Returns the string with secrets and <private> blocks redacted. */
export function scrub(input: string): string {
  if (!input) return input;
  let out = input.replace(PRIVATE_TAG_RE, "[private redacted]");

  for (const { name, re } of SECRET_PATTERNS) {
    out = out.replace(re, `[REDACTED:${name}]`);
  }

  return out;
}

/** Detect Anthropic-style binary content blocks: `{type: "image" | "document",
 *  source: {type: "base64", media_type, data}}`. These appear in tool_result
 *  payloads from screenshot tools and document MCPs. A single 1080p JPEG is
 *  ~50-80 KB of base64; a batch of 20 such captures blows past Claude's
 *  per-request content-block limits and the daemon's extract call returns
 *  `invalid_request`. Redacting the base64 payload (while preserving shape)
 *  keeps the observation useful ("a screenshot of media_type X happened
 *  here") without shipping the bytes. */
function isBinaryContentBlock(obj: Record<string, unknown>): boolean {
  if (obj.type !== "image" && obj.type !== "document") return false;
  const source = obj.source as Record<string, unknown> | undefined;

  if (!source || source.type !== "base64") return false;
  const data = source.data;

  return typeof data === "string" && !data.startsWith(REDACTED_DATA_PREFIX);
}

function redactBinarySource(obj: Record<string, unknown>): Record<string, unknown> {
  const source = obj.source as Record<string, unknown>;
  const bytes = (source.data as string).length;

  return {
    ...obj,
    source: {
      ...source,
      data: `${REDACTED_DATA_PREFIX}${bytes} base64 chars]`,
    },
  };
}

/** Recursive scrubber for arbitrary JSON-like values (TraceStore.Scrubber shape).
 *  Also strips inline base64 payloads from Anthropic image/document content
 *  blocks — see `isBinaryContentBlock` for why. */
export function scrubData(data: unknown): unknown {
  if (typeof data === "string") return scrub(data);
  if (Array.isArray(data)) return data.map(scrubData);

  if (data && typeof data === "object") {
    let obj = data as Record<string, unknown>;

    if (isBinaryContentBlock(obj)) {
      obj = redactBinarySource(obj);
    }

    const out: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(obj)) {
      out[k] = scrubData(v);
    }

    return out;
  }

  return data;
}
