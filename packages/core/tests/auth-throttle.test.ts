import { beforeEach, describe, expect, test } from "bun:test";

const {
  adminLockActive,
  recordAdminFailure,
  clearIpFailures,
  adminLockRetryAfterSec,
  clientIp,
  __resetAdminThrottle,
} = await import("../src/auth-throttle.ts");

// Defaults (no env overrides): 5 fails/IP, 50 global, 15-min window/lockout.
const IP = "203.0.113.7";
const T = 1_000_000_000_000; // fixed base instant
const WINDOW_MS = 15 * 60_000;

beforeEach(() => __resetAdminThrottle());

describe("per-IP lockout", () => {
  test("not locked below the threshold", () => {
    for (let i = 0; i < 4; i++) recordAdminFailure(IP, T);
    expect(adminLockActive(IP, T)).toBe(false);
  });

  test("locks on the Nth consecutive failure", () => {
    for (let i = 0; i < 5; i++) recordAdminFailure(IP, T);
    expect(adminLockActive(IP, T)).toBe(true);
  });

  test("a different IP stays unlocked", () => {
    for (let i = 0; i < 5; i++) recordAdminFailure(IP, T);
    expect(adminLockActive("198.51.100.1", T)).toBe(false);
  });

  test("clearIpFailures resets the counter", () => {
    for (let i = 0; i < 4; i++) recordAdminFailure(IP, T);
    clearIpFailures(IP);
    for (let i = 0; i < 4; i++) recordAdminFailure(IP, T);
    expect(adminLockActive(IP, T)).toBe(false);
  });

  test("lockout clears after the cooldown window", () => {
    for (let i = 0; i < 5; i++) recordAdminFailure(IP, T);
    expect(adminLockActive(IP, T)).toBe(true);
    expect(adminLockActive(IP, T + WINDOW_MS + 1)).toBe(false);
  });

  test("failures older than the window do not accumulate", () => {
    for (let i = 0; i < 4; i++) recordAdminFailure(IP, T);
    // Next failure lands after the window — the prior 4 have aged out.
    recordAdminFailure(IP, T + WINDOW_MS + 1);
    expect(adminLockActive(IP, T + WINDOW_MS + 1)).toBe(false);
  });

  test("Retry-After reports remaining cooldown seconds while locked", () => {
    for (let i = 0; i < 5; i++) recordAdminFailure(IP, T);
    expect(adminLockRetryAfterSec(IP, T)).toBeGreaterThan(0);
    expect(adminLockRetryAfterSec(IP, T + WINDOW_MS + 1)).toBe(0);
  });
});

describe("global backstop (IP rotation)", () => {
  test("locks across many distinct IPs each below the per-IP threshold", () => {
    for (let i = 0; i < 49; i++) recordAdminFailure(`10.0.0.${i}`, T);
    // 49 distinct IPs, one failure each: no IP is per-IP locked, global not yet tripped.
    expect(adminLockActive("172.16.0.1", T)).toBe(false);
    recordAdminFailure("10.0.0.49", T); // 50th global failure
    // A brand-new IP is now refused via the global lock.
    expect(adminLockActive("172.16.0.1", T)).toBe(true);
  });
});

describe("clientIp header precedence", () => {
  const ip = (h: Record<string, string>) => clientIp((n) => h[n]);

  test("prefers cf-connecting-ip", () => {
    expect(
      ip({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2", "x-real-ip": "3.3.3.3" }),
    ).toBe("1.1.1.1");
  });

  test("falls back to the leftmost x-forwarded-for entry", () => {
    expect(ip({ "x-forwarded-for": "4.4.4.4, 5.5.5.5", "x-real-ip": "6.6.6.6" })).toBe("4.4.4.4");
  });

  test("falls back to x-real-ip", () => {
    expect(ip({ "x-real-ip": "7.7.7.7" })).toBe("7.7.7.7");
  });

  test("returns 'unknown' when no proxy header is present", () => {
    expect(ip({})).toBe("unknown");
  });
});
