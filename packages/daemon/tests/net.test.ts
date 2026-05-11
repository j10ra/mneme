// Network-error classifier covers both Bun's normalized codes and the
// POSIX-style codes Node's fetch (and older Bun) surface, so the daemon
// can quietly weather lid-close sleep, brief Wi-Fi flap, and tunnel
// renegotiation without spamming WARN/ERROR.

import { describe, expect, test } from "bun:test";
import { isNetworkOfflineError } from "../src/net.ts";

describe("isNetworkOfflineError", () => {
  test("returns false for null / undefined / non-objects", () => {
    expect(isNetworkOfflineError(null)).toBe(false);
    expect(isNetworkOfflineError(undefined)).toBe(false);
    expect(isNetworkOfflineError("string error")).toBe(false);
    expect(isNetworkOfflineError(42)).toBe(false);
  });

  test("matches Bun-normalized network codes", () => {
    expect(isNetworkOfflineError({ code: "ConnectionRefused" })).toBe(true);
    expect(isNetworkOfflineError({ code: "ConnectionTimedOut" })).toBe(true);
    expect(isNetworkOfflineError({ code: "ConnectionReset" })).toBe(true);
  });

  test("matches POSIX network codes (Node fetch / older Bun)", () => {
    expect(isNetworkOfflineError({ code: "ECONNREFUSED" })).toBe(true);
    expect(isNetworkOfflineError({ code: "ENOTFOUND" })).toBe(true);
    expect(isNetworkOfflineError({ code: "EAI_AGAIN" })).toBe(true);
    expect(isNetworkOfflineError({ code: "ETIMEDOUT" })).toBe(true);
  });

  test("matches via wrapped err.cause (Node 22's fetch shape)", () => {
    const wrapped = {
      message: "fetch failed",
      cause: { code: "ECONNREFUSED", message: "connect ECONNREFUSED" },
    };
    expect(isNetworkOfflineError(wrapped)).toBe(true);
  });

  test("matches by message pattern when no code is present", () => {
    expect(
      isNetworkOfflineError({
        message: "Was there a typo in the url or port?",
      }),
    ).toBe(true);
    expect(isNetworkOfflineError({ message: "Unable to connect" })).toBe(true);
    expect(isNetworkOfflineError({ message: "fetch failed" })).toBe(true);
  });

  test("returns false for HTTP-level / app-level errors", () => {
    expect(isNetworkOfflineError(new Error("heartbeat 401"))).toBe(false);
    expect(isNetworkOfflineError(new Error("heartbeat 500"))).toBe(false);
    expect(isNetworkOfflineError({ code: "EBADREQUEST" })).toBe(false);
    expect(isNetworkOfflineError({ message: "validation failed" })).toBe(false);
  });

  test("returns false for unrelated errors with similar shape", () => {
    expect(isNetworkOfflineError({ code: "SOMETHING_ELSE", message: "ok" })).toBe(false);
  });
});
