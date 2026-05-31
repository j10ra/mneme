// Agent registry. Worker loops resolve their provider through pickAgent;
// the CLI surfaces the catalog via listAgents. New providers land as one
// new file in this directory plus one entry in REGISTRY.

import { claudeProvider } from "./claude.ts";
import type { AgentProvider } from "./types.ts";

const REGISTRY: Record<string, AgentProvider> = {
  claude: claudeProvider,
};

export function pickAgent(name: string): AgentProvider {
  const provider = REGISTRY[name];

  if (!provider) {
    throw new Error(`unknown agent provider: "${name}". Available: ${listAgents().join(", ")}`);
  }

  return provider;
}

export function listAgents(): string[] {
  return Object.keys(REGISTRY);
}

export type { AgentProvider } from "./types.ts";
