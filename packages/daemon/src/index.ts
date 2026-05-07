// Daemon entry point. Phase 1 scaffolding: fills in over PR-2 (embed
// spike), PR-3 (outbox), PR-4 (Claude provider), PR-5 (HTTP server +
// extract loop), PR-8 (dream loop), PR-9 (push wiring).

export { listAgents, pickAgent } from "./agents/index.ts";
export type {
  AgentProvider,
  AvailabilityStatus,
  Capture,
  DreamOutput,
  Memory,
} from "./agents/types.ts";
