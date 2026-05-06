// @bun
// @ts-nocheck

// packages/shared/src/scrub.ts
var SECRET_PATTERNS = [
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
    re: /-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*?-----END[A-Z ]*PRIVATE KEY-----/g
  },
  {
    name: "url_userinfo",
    re: /(?<=\b[a-zA-Z][a-zA-Z0-9+.-]{0,30}:\/\/)[^\s/@:]+:[^\s/@]+(?=@)/g
  }
];
var PRIVATE_TAG_RE = /<private[^>]*>[\s\S]*?<\/private>/gi;
function scrub(input) {
  if (!input)
    return input;
  let out = input.replace(PRIVATE_TAG_RE, "[private redacted]");
  for (const { name, re } of SECRET_PATTERNS) {
    out = out.replace(re, `[REDACTED:${name}]`);
  }
  return out;
}
function scrubData(data) {
  if (typeof data === "string")
    return scrub(data);
  if (Array.isArray(data))
    return data.map(scrubData);
  if (data && typeof data === "object") {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = scrubData(v);
    }
    return out;
  }
  return data;
}
export {
  scrubData,
  scrub
};
