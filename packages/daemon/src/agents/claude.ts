// Claude provider — stub.
//
// Phase 1 wiring lands in a later PR. For now this exists only so the
// registry has a real entry under name="claude" that downstream code can
// pick. Calling extract() / distill() throws so accidental dispatch in
// tests or a half-wired daemon fails loudly rather than silently no-op'ing.

import type {
  AgentProvider,
  AvailabilityStatus,
  Capture,
  DreamOutput,
  Memory,
} from "./types.ts";

export const claudeProvider: AgentProvider = {
  name: "claude",

  async isAvailable(): Promise<AvailabilityStatus> {
    return { available: false, detail: "claude provider not implemented yet" };
  },

  async extract(_input: { captures: Capture[] }): Promise<Memory[]> {
    throw new Error("claude.extract not implemented yet");
  },

  async distill(_cluster: Memory[]): Promise<DreamOutput> {
    throw new Error("claude.distill not implemented yet");
  },

  supportsDream(): boolean {
    return true;
  },
};
