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

/** Inputs for the cluster-merge judgment used by the ascend worker
 *  (#30). Two cluster summaries → "are these the same underlying
 *  topic, or topically adjacent but distinct?" */
export type ClusterSummary = {
  title: string;
  summary: string;
};

export type ClusterMergeJudgment = {
  same_topic: boolean;
  reason: string;
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

/** Input shape for the supersede LLM pass. Each candidate is a memory the
 *  model is allowed to mark as either the old or new side of a supersede
 *  pair. created_at is included so the model can verify chronology. */
export type SupersedeCandidate = {
  id: string;
  kind: Kind;
  content: string;
  created_at: string;
};

export type SupersedePair = {
  old_id: string;
  new_id: string;
  reason: string;
};

/** All providers must export these functions and constants. The model
 *  fields are recorded on every memory's meta JSONB for provenance —
 *  e.g. so you can later query "memories extracted by Sonnet vs 7B".
 *
 *  `findSupersedes` is OPTIONAL: only providers we trust to make this
 *  judgement implement it (today: openrouter only). The picker checks
 *  for its presence and skips the supersede pass on local. */
export type LLMProvider = {
  extractObservations: (captureText: string) => Promise<Observation[]>;
  distillCluster: (memberContents: string) => Promise<ClusterDistillation>;
  findSupersedes?: (
    candidates: SupersedeCandidate[],
  ) => Promise<SupersedePair[]>;
  /** Cross-cluster merge judgment for the ascend worker (#30). Like
   *  `findSupersedes`, only providers we trust to make this call
   *  implement it (today: openrouter only). Local omits to keep the
   *  7B/3B path off a high-stakes decision. */
  judgeClusterMerge?: (
    a: ClusterSummary,
    b: ClusterSummary,
  ) => Promise<ClusterMergeJudgment>;
  extractLimits: ExtractLimits;
  dreamLimits: DreamLimits;
  extractModel: string;
  dreamModel: string;
};
