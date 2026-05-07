// machineFingerprint() probe smoke tests.
//
// On the platform actually running the test, the helper should return a
// non-empty stable identifier. Other platforms can't assert on the
// content (no /etc/machine-id on darwin, etc.), so we just check shape.

import { describe, expect, test } from "bun:test";
import { platform } from "node:os";
import { machineFingerprint } from "../scripts/config.ts";

describe("machineFingerprint", () => {
  test("returns a stable id on the host platform", () => {
    const id = machineFingerprint();
    const p = platform();
    if (p === "darwin" || p === "linux" || p === "win32") {
      expect(typeof id).toBe("string");
      expect((id ?? "").length).toBeGreaterThan(8);
    } else {
      expect(id).toBeNull();
    }
  });

  test("is deterministic across calls", () => {
    const a = machineFingerprint();
    const b = machineFingerprint();
    expect(a).toBe(b);
  });
});
