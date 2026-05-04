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
] as const;

export type Kind = (typeof KINDS)[number];

export type Observation = {
  content: string;
  kind: Kind;
  importance: number;
  topics: string[];
};

/** All providers must export `extractObservations` matching this signature. */
export type LLMProvider = {
  extractObservations: (captureText: string) => Promise<Observation[]>;
};
