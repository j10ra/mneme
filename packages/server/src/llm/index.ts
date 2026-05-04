// LLM provider selector. Mneme is provider-agnostic: any implementation that
// exports `extractObservations` matching the LLMProvider type can be plugged
// in here. Today only "local" (homelab Ollama via OpenAI-compat) is wired —
// adding a new provider is one new file under llm/ + one entry below.

import * as local from "./local.ts";

const PROVIDERS = {
  local,
} as const satisfies Record<string, { extractObservations: typeof local.extractObservations }>;

type ProviderName = keyof typeof PROVIDERS;

const PROVIDER_NAME = (process.env.LLM_PROVIDER ?? "local") as ProviderName;

if (!(PROVIDER_NAME in PROVIDERS)) {
  throw new Error(
    `Unknown LLM_PROVIDER: ${PROVIDER_NAME}. Available: ${Object.keys(PROVIDERS).join(", ")}`,
  );
}

const provider = PROVIDERS[PROVIDER_NAME];

export const extractObservations = provider.extractObservations;

export { KINDS, type Kind, type Observation } from "./types.ts";
