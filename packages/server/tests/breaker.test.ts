import { describe, expect, test } from "bun:test";
import { Breaker } from "../src/breaker.ts";

function fakeClock(start = 1_000_000) {
  let now = start;
  return {
    read: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("Breaker.gate", () => {
  test("fresh breaker is closed", () => {
    const b = new Breaker({ threshold: 3, pauseMs: 1000 });
    expect(b.gate()).toEqual({ open: false });
  });

  test("opens after threshold consecutive failures", () => {
    const clock = fakeClock();
    const b = new Breaker({ threshold: 3, pauseMs: 1000, clock: clock.read });
    b.report("failure");
    b.report("failure");
    expect(b.gate()).toEqual({ open: false });
    b.report("failure");
    expect(b.gate()).toEqual({ open: true, pauseMs: 1000 });
  });

  test("pauseMs reflects remaining cooldown as clock advances", () => {
    const clock = fakeClock();
    const b = new Breaker({ threshold: 1, pauseMs: 1000, clock: clock.read });
    b.report("failure");
    expect(b.gate()).toEqual({ open: true, pauseMs: 1000 });
    clock.advance(400);
    expect(b.gate()).toEqual({ open: true, pauseMs: 600 });
  });

  test("closes when clock passes openUntil", () => {
    const clock = fakeClock();
    const b = new Breaker({ threshold: 1, pauseMs: 1000, clock: clock.read });
    b.report("failure");
    clock.advance(1001);
    expect(b.gate()).toEqual({ open: false });
  });
});

describe("Breaker.report", () => {
  test("success resets the failure counter", () => {
    const clock = fakeClock();
    const b = new Breaker({ threshold: 3, pauseMs: 1000, clock: clock.read });
    b.report("failure");
    b.report("failure");
    b.report("success");
    b.report("failure");
    b.report("failure");
    expect(b.gate()).toEqual({ open: false });
  });

  test("success closes an open breaker immediately", () => {
    const clock = fakeClock();
    const b = new Breaker({ threshold: 1, pauseMs: 1000, clock: clock.read });
    b.report("failure");
    expect(b.gate().open).toBe(true);
    b.report("success");
    expect(b.gate()).toEqual({ open: false });
  });

  test("a single failure after cooldown re-opens the breaker (still-broken-upstream semantic)", () => {
    // The point of the breaker isn't to give a still-failing upstream another
    // `threshold` requests to repeat the same failure — it's to back off
    // immediately if the failures resume. Without this, a permanently
    // rate-limited LLM eats `threshold` extra requests per cooldown cycle.
    const clock = fakeClock();
    const b = new Breaker({ threshold: 2, pauseMs: 1000, clock: clock.read });
    b.report("failure");
    b.report("failure");
    expect(b.gate().open).toBe(true);

    clock.advance(1001);
    expect(b.gate()).toEqual({ open: false });

    // One more failure — failures was 2 before, now 3 (≥ threshold) → reopen.
    b.report("failure");
    expect(b.gate()).toEqual({ open: true, pauseMs: 1000 });
  });

  test("a success between cooldowns resets the count back to fresh", () => {
    const clock = fakeClock();
    const b = new Breaker({ threshold: 2, pauseMs: 1000, clock: clock.read });
    b.report("failure");
    b.report("failure");
    clock.advance(1001);
    b.report("success");
    // Now needs the full threshold of failures again.
    b.report("failure");
    expect(b.gate()).toEqual({ open: false });
    b.report("failure");
    expect(b.gate()).toEqual({ open: true, pauseMs: 1000 });
  });

  test("report returns priorFailures and openedNow", () => {
    const clock = fakeClock();
    const b = new Breaker({ threshold: 2, pauseMs: 1000, clock: clock.read });
    expect(b.report("failure")).toEqual({ priorFailures: 0, openedNow: false });
    expect(b.report("failure")).toEqual({ priorFailures: 1, openedNow: true });
    // priorFailures = 2 because failures keeps counting through cooldown;
    // success then resets the count.
    expect(b.report("success")).toEqual({ priorFailures: 2, openedNow: false });
  });

  test("priorFailures captures state before the current call", () => {
    const clock = fakeClock();
    const b = new Breaker({ threshold: 5, pauseMs: 1000, clock: clock.read });
    b.report("failure");
    b.report("failure");
    expect(b.report("success").priorFailures).toBe(2);
  });

  test("only success can clear openUntil", () => {
    const clock = fakeClock();
    const b = new Breaker({ threshold: 1, pauseMs: 1000, clock: clock.read });
    b.report("failure");
    clock.advance(1001);
    // openUntil is still set in state but gate is closed via clock comparison.
    expect(b.gate()).toEqual({ open: false });
    // A subsequent success then explicitly clears the state for the next
    // observer that introspects via gate transitions.
    const r = b.report("success");
    // failures was 1 (the failure that opened the breaker; counter not
    // reset on open under the still-broken-upstream semantic).
    expect(r.priorFailures).toBe(1);
    expect(b.gate()).toEqual({ open: false });
  });
});
