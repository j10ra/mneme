// @bun
// @ts-nocheck

// packages/shared/src/scrub.ts
var SECRET_PATTERNS = [
  { name: "aws_access_key", re: /AKIA[0-9A-Z]{16}/g },
  {
    name: "github_pat_classic",
    re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g
  },
  { name: "github_pat_fine", re: /\bgithub_pat_[A-Za-z0-9_]{82,}\b/g },
  { name: "anthropic_key", re: /\bsk-ant-(?:api\d{2}-)?[A-Za-z0-9_-]{40,}\b/g },
  { name: "openai_key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/g },
  { name: "groq_key", re: /\bgsk_[A-Za-z0-9]{40,}\b/g },
  { name: "voyage_key", re: /\bpa-[A-Za-z0-9_-]{40,}\b/g },
  { name: "slack_token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  {
    name: "jwt",
    re: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
  },
  { name: "bearer_header", re: /\b[Bb]earer\s+[A-Za-z0-9_\-.=]{20,}/g },
  { name: "mneme_token", re: /\bmneme_(?:pat|oauth|refresh|code)_[A-Za-z0-9_-]{16,}/g },
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
var REDACTED_DATA_PREFIX = "[redacted: ";
function scrub(input) {
  if (!input)
    return input;
  let out = input.replace(PRIVATE_TAG_RE, "[private redacted]");
  for (const { name, re } of SECRET_PATTERNS) {
    out = out.replace(re, `[REDACTED:${name}]`);
  }
  return out;
}
function isBinaryContentBlock(obj) {
  if (obj.type !== "image" && obj.type !== "document")
    return false;
  const source = obj.source;
  if (!source || source.type !== "base64")
    return false;
  const data = source.data;
  return typeof data === "string" && !data.startsWith(REDACTED_DATA_PREFIX);
}
function redactBinarySource(obj) {
  const source = obj.source;
  const bytes = source.data.length;
  return {
    ...obj,
    source: {
      ...source,
      data: `${REDACTED_DATA_PREFIX}${bytes} base64 chars]`
    }
  };
}
function scrubData(data) {
  if (typeof data === "string")
    return scrub(data);
  if (Array.isArray(data))
    return data.map(scrubData);
  if (data && typeof data === "object") {
    let obj = data;
    if (isBinaryContentBlock(obj)) {
      obj = redactBinarySource(obj);
    }
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
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
