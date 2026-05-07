// AgentProvider — the contract between the daemon's worker loops and
// whichever LLM-driven agent runs the extract / distill calls.
//
// Phase 1 wires only Claude. Codex / Cursor / Gemini are future packages
// that implement this same shape, dropped under packages/daemon/src/agents/
// and registered in agents/index.ts. The user picks the active provider via
// `mneme agent set <name>`, persisted to ~/.mneme/config.json.

export type Capture = {
  content: string;
  source: string;
  hostname: string;
  repo: string | null;
  harness: string;
  agent: string | null;
  session_id: string | null;
  topics: string[];
  private: boolean;
  raw_meta: Record<string, unknown>;
};

export type Memory = {
  content: string;
  content_hash: string;
  chunk_id: string;
  embedding?: number[];
  embedding_model?: string;
  kind: string;
  importance: number;
  topics: string[];
  meta: Record<string, unknown>;
};

export type DreamOutput = {
  title: string;
  summary: string;
  supersede_pairs?: Array<{ old_id: string; new_id: string; reason: string }>;
};

export type AvailabilityStatus = {
  available: boolean;
  detail: string;
};

export interface AgentProvider {
  name: string;
  isAvailable(): Promise<AvailabilityStatus>;
  extract(input: { captures: Capture[] }): Promise<Memory[]>;
  distill?(cluster: Memory[]): Promise<DreamOutput>;
  supportsDream(): boolean;
}
