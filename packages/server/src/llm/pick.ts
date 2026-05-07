// Per-pipeline LLM provider picker with per-provider circuit breaker.
//
// Mneme talks to two providers: "openrouter" (cloud, primary when
// OPENROUTER_API_KEY is set) and "local" (compute.jalipalo.dev, the
// always-available fallback that also serves embeddings). Each pipeline
// asks the picker at lock time for an instance; the instance carries the
// provider's limits + model and exposes wrapped methods that report
// success/failure to the breaker transparently — callers no longer need
// to remember a `reportSuccess(name)` / `reportFailure(name)` pair after
// every LLM round-trip.
//
// Breaker semantics (see breaker.ts):
//   - 3 consecutive failures on a provider → cooldown opens for 5 min
//   - while open, picker returns the other provider
//   - first success after cooldown resets the state
//   - both breakers open simultaneously is rare and "fail open": picker
//     returns the configured-default and the call fails naturally
//
// Override:
//   - LLM_PROVIDER_FORCE=local       → always local
//   - LLM_PROVIDER_FORCE=openrouter  → always openrouter (bypasses the
//                                      pick-time breaker check; the
//                                      wrapped methods still report,
//                                      so the breaker state is visible
//                                      in logs even when forced)
//   - blank / unset                  → auto

import { Logger } from "@mneme/core";
import { Breaker } from "../breaker.ts";
import { PICKER_COOLDOWN_MS, PICKER_FAILURE_THRESHOLD } from "../config.ts";
import { env } from "../env.ts";
import * as local from "./providers/local.ts";
import * as openrouter from "./providers/openrouter.ts";
import type {
  ClusterDistillation,
  DreamLimits,
  ExtractLimits,
  LLMProvider,
  Observation,
  SupersedeCandidate,
  SupersedePair,
} from "./types.ts";

const PROVIDERS = {
  local,
  openrouter,
} as const satisfies Record<string, LLMProvider>;

export type ProviderName = keyof typeof PROVIDERS;

const breakers: Record<ProviderName, Breaker> = {
  local: new Breaker({
    threshold: PICKER_FAILURE_THRESHOLD,
    pauseMs: PICKER_COOLDOWN_MS,
  }),
  openrouter: new Breaker({
    threshold: PICKER_FAILURE_THRESHOLD,
    pauseMs: PICKER_COOLDOWN_MS,
  }),
};

const FORCE: ProviderName | null = env.LLM_PROVIDER_FORCE || null;

function pickProviderName(): ProviderName {
  if (FORCE) return FORCE;
  if (!env.HAS_OPENROUTER) return "local";
  if (breakers.openrouter.gate().open) return "local";
  return "openrouter";
}

// Wrap an LLM call so success/failure transparently feeds the
// per-provider breaker and the transition log. Errors re-throw — the
// caller still needs to handle them (mark a job state='error', skip a
// cluster, etc); the wrapper just removes the bookkeeping ceremony.
function reportingCall<TArgs extends unknown[], TResult>(
  name: ProviderName,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args) => {
    const breaker = breakers[name];
    try {
      const result = await fn(...args);
      const r = breaker.report("success");
      if (r.priorFailures > 0) {
        Logger.info("llm.pick: breaker reset", { provider: name });
      }
      return result;
    } catch (e) {
      const r = breaker.report("failure");
      if (r.openedNow) {
        Logger.info("llm.pick: breaker opened", {
          provider: name,
          failures: r.priorFailures + 1,
          reopensAt: new Date(Date.now() + PICKER_COOLDOWN_MS).toISOString(),
        });
      }
      throw e;
    }
  };
}

export type ExtractInstance = {
  name: ProviderName;
  limits: ExtractLimits;
  model: string;
  extractObservations: (text: string) => Promise<Observation[]>;
};

// findSupersedes is OPTIONAL: only providers we trust to make this
// judgement implement it (today: openrouter only). Local providers omit
// the method entirely; callers do `if (!instance.findSupersedes) return`
// — a typed presence check, no runtime name comparison required.
export type DreamInstance = {
  name: ProviderName;
  limits: DreamLimits;
  model: string;
  distillCluster: (text: string) => Promise<ClusterDistillation>;
  findSupersedes?: (
    candidates: SupersedeCandidate[],
  ) => Promise<SupersedePair[]>;
};

export function pickExtract(): ExtractInstance {
  const name = pickProviderName();
  const p: LLMProvider = PROVIDERS[name];
  return {
    name,
    limits: p.extractLimits,
    model: p.extractModel,
    extractObservations: reportingCall(name, p.extractObservations),
  };
}

export function pickDream(): DreamInstance {
  const name = pickProviderName();
  const p: LLMProvider = PROVIDERS[name];
  const base: DreamInstance = {
    name,
    limits: p.dreamLimits,
    model: p.dreamModel,
    distillCluster: reportingCall(name, p.distillCluster),
  };
  if (p.findSupersedes) {
    base.findSupersedes = reportingCall(name, p.findSupersedes);
  }
  return base;
}

Logger.info("llm.pick: configured", {
  force: FORCE ?? "(auto)",
  hasOpenrouter: env.HAS_OPENROUTER,
  defaultPick: pickProviderName(),
});
