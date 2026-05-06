// Per-pipeline LLM provider picker with per-provider circuit breaker.
//
// Mneme talks to two providers: "openrouter" (cloud, primary when
// OPENROUTER_API_KEY is set) and "local" (compute.jalipalo.dev, the
// always-available fallback that also serves embeddings). Each pipeline
// (extract, dream) asks the picker at lock time for the provider + the
// limits it declares; pipelines lock siblings and build prompts according
// to those limits, then call the provider.
//
// Breaker semantics:
//   - 3 consecutive failures on a provider → cooldown opens for 5 min
//   - while open, picker returns the other provider
//   - first success after the cooldown window expires resets the state
//   - both breakers open simultaneously is rare and "fail open": we pick
//     the configured-default and let the call fail naturally rather than
//     block all jobs forever
//
// Override:
//   - LLM_PROVIDER_FORCE=local       → always local
//   - LLM_PROVIDER_FORCE=openrouter  → always openrouter (bypasses breaker)
//   - blank / unset                  → auto

import { Logger } from "@mneme/core";
import { Breaker } from "../breaker.ts";
import { PICKER_COOLDOWN_MS, PICKER_FAILURE_THRESHOLD } from "../config.ts";
import { env } from "../env.ts";
import * as local from "./providers/local.ts";
import * as openrouter from "./providers/openrouter.ts";
import type { LLMProvider, DreamLimits, ExtractLimits } from "./types.ts";

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

function isBreakerOpen(name: ProviderName): boolean {
  return breakers[name].gate().open;
}

function pickProviderName(): ProviderName {
  if (FORCE) return FORCE;
  if (!env.HAS_OPENROUTER) return "local";
  if (isBreakerOpen("openrouter")) return "local";
  return "openrouter";
}

export type ExtractPick = {
  provider: LLMProvider;
  providerName: ProviderName;
  limits: ExtractLimits;
};

export type DreamPick = {
  provider: LLMProvider;
  providerName: ProviderName;
  limits: DreamLimits;
};

export function pickExtract(): ExtractPick {
  const name = pickProviderName();
  const provider = PROVIDERS[name];
  return { provider, providerName: name, limits: provider.extractLimits };
}

export function pickDream(): DreamPick {
  const name = pickProviderName();
  const provider = PROVIDERS[name];
  return { provider, providerName: name, limits: provider.dreamLimits };
}

export function reportSuccess(name: ProviderName): void {
  const r = breakers[name].report("success");
  if (r.priorFailures > 0) {
    Logger.info("llm.pick: breaker reset", { provider: name });
  }
}

export function reportFailure(name: ProviderName): void {
  const r = breakers[name].report("failure");
  if (r.openedNow) {
    Logger.info("llm.pick: breaker opened", {
      provider: name,
      failures: r.priorFailures + 1,
      reopensAt: new Date(Date.now() + PICKER_COOLDOWN_MS).toISOString(),
    });
  }
}

Logger.info("llm.pick: configured", {
  force: FORCE ?? "(auto)",
  hasOpenrouter: env.HAS_OPENROUTER,
  defaultPick: pickProviderName(),
});
