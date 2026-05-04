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

/** All providers must export these functions. */
export type LLMProvider = {
  extractObservations: (captureText: string) => Promise<Observation[]>;
  distillCluster: (memberContents: string) => Promise<ClusterDistillation>;
};
