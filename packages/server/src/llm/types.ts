// LLM provider-agnostic types. Shared across all implementations under llm/.

export const KINDS = [
  "note",
  "bugfix",
  "feature",
  "discovery",
  "decision",
  "preference",
  "constraint",
  "security_alert",
  "reference",
  "summary",
  "cluster",
] as const;

export type Kind = (typeof KINDS)[number];

export type Observation = {
  content: string;
  kind: Kind;
  importance: number;
  topics: string[];
};

export type ClusterDistillation = {
  title: string;
  summary: string;
};

/** Per-pipeline batching/output ceilings the extract worker must respect.
 *  Each provider declares its own values — local stays conservative under
 *  the CF Tunnel 100s no-data window; cloud providers can be much more
 *  generous since prompt-eval is fast and there's no tunnel in the path. */
export type ExtractLimits = {
  maxCharsPerCapture: number;
  maxTotalChars: number;
  maxSiblings: number;
  maxOutputTokens: number;
};

/** Per-cluster ceilings the dream worker must respect. */
export type DreamLimits = {
  maxClusterChars: number;
  maxOutputTokens: number;
  temperature: number;
};

/** All providers must export these functions and constants. The model
 *  fields are recorded on every memory's meta JSONB for provenance —
 *  e.g. so you can later query "memories extracted by Sonnet vs 7B". */
export type LLMProvider = {
  extractObservations: (captureText: string) => Promise<Observation[]>;
  distillCluster: (memberContents: string) => Promise<ClusterDistillation>;
  extractLimits: ExtractLimits;
  dreamLimits: DreamLimits;
  extractModel: string;
  dreamModel: string;
};
