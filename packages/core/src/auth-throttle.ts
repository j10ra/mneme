// In-memory brute-force throttle for the ADMIN_PASSWORD emergency bearer
// (#53). That password bypasses _ops.api_keys entirely (scope ["*"]) and is
// guarded only by a constant-time compare, so without this an attacker can
// guess it online as fast as the network allows. Two layers:
//
//   per-IP   — N consecutive failures from one source IP lock that IP out
//              for a cooldown window. Stops the naive single-host attack.
//   global   — a windowed failure count across ALL IPs. Backstop for an
//              attacker rotating X-Forwarded-For to dodge the per-IP counter.
//
// State is process-local and best-effort: it resets on restart and isn't
// shared across replicas. That's acceptable — the goal is to make sustained
// online guessing impractical, not to be a durable security store. The real
// root-of-trust remains a high-entropy ADMIN_PASSWORD (see .env.example).

function numFromEnv(name: string, dflt: number): number {
  const v = Number(process.env[name]);

  return Number.isFinite(v) && v > 0 ? v : dflt;
}

const MAX_FAILS_PER_IP = numFromEnv("MNEME_ADMIN_MAX_FAILS", 5);
const PER_IP_LOCKOUT_MS = numFromEnv("MNEME_ADMIN_LOCKOUT_MS", 15 * 60_000);
const GLOBAL_MAX_FAILS = numFromEnv("MNEME_ADMIN_GLOBAL_MAX_FAILS", 50);
// The failure window doubles as the lockout duration for both layers.
const WINDOW_MS = PER_IP_LOCKOUT_MS;
const MAX_TRACKED_IPS = 10_000; // bound memory under IP rotation

type Bucket = { fails: number; first: number; lockedUntil: number };

const perIp = new Map<string, Bucket>();
const globalBucket: Bucket = { fails: 0, first: 0, lockedUntil: 0 };

function reset(b: Bucket, now: number): void {
  b.fails = 0;
  b.first = now;
  b.lockedUntil = 0;
}

// Age a bucket forward: clear an expired lockout, or roll a stale failure
// window so old misses don't accumulate across hours.
function roll(b: Bucket, now: number): void {
  if (b.lockedUntil) {
    if (now >= b.lockedUntil) reset(b, now);
  } else if (b.first && now - b.first > WINDOW_MS) {
    reset(b, now);
  }
}

/** True while the admin-password path is in cooldown for this IP (per-IP
 *  lockout) or globally (rotation backstop). When true the caller must NOT
 *  compare the password — valid API keys are checked separately and stay
 *  unaffected. */
export function adminLockActive(ip: string, now: number = Date.now()): boolean {
  roll(globalBucket, now);
  if (globalBucket.lockedUntil && now < globalBucket.lockedUntil) return true;
  const b = perIp.get(ip);

  if (!b) return false;
  roll(b, now);

  return b.lockedUntil > 0 && now < b.lockedUntil;
}

/** Record a terminal auth failure (no admin match, no valid key) from this
 *  IP. Arms the per-IP and global lockouts when their thresholds trip. */
export function recordAdminFailure(ip: string, now: number = Date.now()): void {
  roll(globalBucket, now);
  if (!globalBucket.first) globalBucket.first = now;
  globalBucket.fails += 1;
  if (globalBucket.fails >= GLOBAL_MAX_FAILS) globalBucket.lockedUntil = now + WINDOW_MS;

  let b = perIp.get(ip);

  if (!b) {
    b = { fails: 0, first: now, lockedUntil: 0 };
    perIp.set(ip, b);
  }

  roll(b, now);
  if (!b.first) b.first = now;
  b.fails += 1;
  if (b.fails >= MAX_FAILS_PER_IP) b.lockedUntil = now + PER_IP_LOCKOUT_MS;

  if (perIp.size > MAX_TRACKED_IPS) prune(now);
}

/** A successful auth from this IP clears its per-IP suspicion. The global
 *  backstop is left to age out on its own — legit success produces no
 *  failures, so it never inflates the global count, and not resetting it
 *  here keeps the rotation backstop honest under interleaved traffic. */
export function clearIpFailures(ip: string): void {
  perIp.delete(ip);
}

function prune(now: number): void {
  for (const [ip, b] of perIp) {
    const expired = b.lockedUntil ? now >= b.lockedUntil : b.first > 0 && now - b.first > WINDOW_MS;

    if (expired) perIp.delete(ip);
  }
}

/** Seconds until this IP (or the global lock) clears, for a Retry-After
 *  header. 0 when not locked. */
export function adminLockRetryAfterSec(ip: string, now: number = Date.now()): number {
  const until = Math.max(globalBucket.lockedUntil, perIp.get(ip)?.lockedUntil ?? 0);

  return until > now ? Math.ceil((until - now) / 1000) : 0;
}

/** Client source IP from proxy headers, most-trusted first. Railway/most
 *  edges set x-forwarded-for; cf-connecting-ip covers a Cloudflare front. */
export function clientIp(getHeader: (name: string) => string | undefined): string {
  const cf = getHeader("cf-connecting-ip")?.trim();

  if (cf) return cf;
  const xff = getHeader("x-forwarded-for");

  if (xff) {
    const first = xff.split(",")[0]?.trim();

    if (first) return first;
  }

  const xr = getHeader("x-real-ip")?.trim();

  if (xr) return xr;

  return "unknown";
}

/** Test-only: wipe all throttle state. */
export function __resetAdminThrottle(): void {
  perIp.clear();
  reset(globalBucket, 0);
}
