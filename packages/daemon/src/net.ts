// Classify a fetch failure as "we're offline / network unreachable" so
// callers can treat those quietly during legitimate offline windows
// (lid-close sleep, brief Wi-Fi flap, VPN tunnel renegotiation).
//
// Bun normalizes a handful of network-layer errors to its own `code`
// strings ("ConnectionRefused", "ConnectionTimedOut", ...). Older Bun
// versions and Node's fetch surface the underlying POSIX codes
// ("ECONNREFUSED", "ENOTFOUND", ...). For the very oldest Bun, only
// the error message is reliable. We match all three layers so the
// classifier is portable across the bun versions plugin hosts run.

const NETWORK_ERROR_CODES = new Set([
  // Bun-normalized
  "ConnectionRefused",
  "ConnectionTimedOut",
  "ConnectionReset",
  "FailedToOpenSocket",
  "UnknownError",
  // POSIX-style (Node's fetch / older bun)
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);

const NETWORK_ERROR_MESSAGE_PATTERNS = [
  /unable to connect/i,
  /typo in the url or port/i,
  /network is unreachable/i,
  /no such host/i,
  /fetch failed/i, // node 22+ generic
];

export function isNetworkOfflineError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; cause?: unknown; message?: unknown };
  if (typeof e.code === "string" && NETWORK_ERROR_CODES.has(e.code)) return true;
  // Wrapped errors (Node 22's fetch wraps the underlying socket error in
  // err.cause). Recurse into cause once.
  if (e.cause && typeof e.cause === "object") {
    const c = e.cause as { code?: unknown };
    if (typeof c.code === "string" && NETWORK_ERROR_CODES.has(c.code)) {
      return true;
    }
  }
  if (typeof e.message === "string") {
    for (const re of NETWORK_ERROR_MESSAGE_PATTERNS) {
      if (re.test(e.message)) return true;
    }
  }
  return false;
}
