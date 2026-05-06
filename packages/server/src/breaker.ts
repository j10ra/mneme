// In-process circuit breaker for external calls (LLM providers, embedder).
// One Breaker per thing-that-can-fail. Pure data + a clock — no logging,
// no DB, no globals — so callers drive it deterministically in tests and
// pick their own log shape.
//
// Lifecycle:
//   gate()    → ask before doing the expensive work
//   report()  → tell the breaker the outcome; returns the transition info
//               the caller needs to log or count
//
// State machine:
//   failures < threshold    → closed
//   failures >= threshold   → open for pauseMs; failure counter resets so
//                             the next window starts fresh after cooldown
//   any success             → resets both failures and openUntil

export type BreakerGate =
  | { open: true; pauseMs: number }
  | { open: false };

export type BreakerReport = {
  /** Failure count immediately before this report was applied. Useful for
   *  log payloads ("recovered after N failures"). */
  priorFailures: number;
  /** True if this report just transitioned the breaker to open. False on
   *  success and on failures that don't cross the threshold. */
  openedNow: boolean;
};

export type BreakerOptions = {
  threshold: number;
  pauseMs: number;
  /** Injected for tests; defaults to Date.now. */
  clock?: () => number;
};

export class Breaker {
  private readonly threshold: number;
  private readonly pauseMs: number;
  private readonly clock: () => number;
  private failures = 0;
  private openUntil = 0;

  constructor(opts: BreakerOptions) {
    this.threshold = opts.threshold;
    this.pauseMs = opts.pauseMs;
    this.clock = opts.clock ?? Date.now;
  }

  gate(): BreakerGate {
    const now = this.clock();
    if (now < this.openUntil) {
      return { open: true, pauseMs: this.openUntil - now };
    }
    return { open: false };
  }

  report(outcome: "success" | "failure"): BreakerReport {
    const priorFailures = this.failures;
    if (outcome === "success") {
      this.failures = 0;
      this.openUntil = 0;
      return { priorFailures, openedNow: false };
    }
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openUntil = this.clock() + this.pauseMs;
      this.failures = 0;
      return { priorFailures, openedNow: true };
    }
    return { priorFailures, openedNow: false };
  }
}
