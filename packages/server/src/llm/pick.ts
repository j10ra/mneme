// LLM provider picker for the digest worker.
//
// The server has exactly one LLM path: OpenRouter, used by digest's two
// cross-cluster judgments (findSupersedes for Op2, judgeClusterMerge
// for Op1). The picker exists only to (a) gate digest off when
// OPENROUTER_API_KEY is unset and (b) trip the circuit breaker after
// consecutive failures so a flapping OpenRouter doesn't burn the
// cycle's Sonnet budget.
//
// Breaker semantics (see lib/breaker.ts):
//   - 3 consecutive failures → cooldown opens for 5 min
//   - while open, pickDigest returns an instance without judgments, so
//     digest skips the LLM passes for that cycle
//   - first success after cooldown resets the state

import { Logger } from "@mneme/core";
import { Breaker, type BreakerState } from "../lib/breaker.ts";
import { PICKER_COOLDOWN_MS, PICKER_FAILURE_THRESHOLD } from "../infra/config.ts";
import { env } from "../infra/env.ts";
import * as openrouter from "./providers/openrouter.ts";
import type {
  ClusterMergeJudgment,
  ClusterSummary,
  DigestLimits,
  LLMProvider,
  SupersedeCandidate,
  SupersedePair,
} from "./types.ts";

export type ProviderName = "openrouter";

const provider: LLMProvider = openrouter;
const breaker = new Breaker({
  threshold: PICKER_FAILURE_THRESHOLD,
  pauseMs: PICKER_COOLDOWN_MS,
});

// Wrap an LLM call so success/failure transparently feeds the breaker
// and the transition log. Errors re-throw — the caller still needs to
// handle them (skip a cycle, log a warn, etc); the wrapper just removes
// the bookkeeping ceremony.
function reportingCall<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args) => {
    try {
      const result = await fn(...args);
      const r = breaker.report("success");

      if (r.priorFailures > 0) {
        Logger.info("llm.pick: breaker reset", { provider: "openrouter" });
      }

      return result;
    } catch (e) {
      const r = breaker.report("failure");

      if (r.openedNow) {
        Logger.info("llm.pick: breaker opened", {
          provider: "openrouter",
          failures: r.priorFailures + 1,
          reopensAt: new Date(Date.now() + PICKER_COOLDOWN_MS).toISOString(),
        });
      }

      throw e;
    }
  };
}

// findSupersedes + judgeClusterMerge are OPTIONAL: when OpenRouter is
// missing the key or the breaker is open, pickDigest returns an instance
// without them and digest's `if (!dr.judgeClusterMerge) skip` path fires.
export type DigestInstance = {
  name: ProviderName;
  limits: DigestLimits;
  model: string;
  findSupersedes?: (candidates: SupersedeCandidate[]) => Promise<SupersedePair[]>;
  judgeClusterMerge?: (a: ClusterSummary, b: ClusterSummary) => Promise<ClusterMergeJudgment>;
};

/** Snapshot of the breaker for /api/_ops/status. Returns a single-key
 *  record keyed on the only provider so the dashboard shape stays
 *  stable even though we collapsed to one provider. */
export function inspectBreakers(): Record<ProviderName, BreakerState> {
  return { openrouter: breaker.inspect() };
}

export function pickDigest(): DigestInstance {
  const base: DigestInstance = {
    name: "openrouter",
    limits: provider.digestLimits,
    model: provider.digestModel,
  };
  // Hide the judgments when OpenRouter is unavailable. Digest's check is
  // `if (!dr.judgeClusterMerge || !dr.findSupersedes) skip`, so this is
  // the gate that turns the whole worker off when the cloud path can't
  // serve the call.
  const available = env.HAS_OPENROUTER && !breaker.gate().open;

  if (available && provider.findSupersedes) {
    base.findSupersedes = reportingCall(provider.findSupersedes);
  }

  if (available && provider.judgeClusterMerge) {
    base.judgeClusterMerge = reportingCall(provider.judgeClusterMerge);
  }

  return base;
}

Logger.info("llm.pick: configured", {
  hasOpenrouter: env.HAS_OPENROUTER,
});
