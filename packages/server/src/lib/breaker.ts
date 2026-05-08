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
//   failures >= threshold   → open for pauseMs; failures keep counting so
//                             a still-broken upstream re-opens immediately
//                             on the first failure after cooldown rather
//                             than burning another `threshold` requests
//                             before tripping again
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

export type BreakerState = {
  open: boolean;
  failures: number;
  reopensInMs: number;
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

  inspect(): BreakerState {
    const now = this.clock();
    return {
      open: now < this.openUntil,
      failures: this.failures,
      reopensInMs: Math.max(0, this.openUntil - now),
    };
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
      const wasOpen = this.openUntil > this.clock();
      this.openUntil = this.clock() + this.pauseMs;
      // openedNow only fires on the closed→open transition. A failure
      // reported while the breaker is still in cooldown extends the
      // window but doesn't double-log. (Callers shouldn't hit this — they
      // gate first — but defending against the misuse keeps logs sane.)
      return { priorFailures, openedNow: !wasOpen };
    }
    return { priorFailures, openedNow: false };
  }
}
