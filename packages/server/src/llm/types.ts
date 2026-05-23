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

/** Inputs for the cluster-merge judgment used by the digest worker
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

/** Per-cluster ceilings digest's cross-cluster Sonnet calls must respect. */
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
 *  field is recorded on every cluster's meta JSONB for provenance.
 *
 *  Server-side extract + distill are gone — the daemon owns those.
 *  Server's remaining LLM surface is digest's two judgments:
 *  findSupersedes (Op2 cross-cluster supersede) and judgeClusterMerge
 *  (Op1 cluster merge). Both are OPTIONAL: only providers we trust to
 *  make these calls implement them (today: openrouter only). The
 *  picker checks for their presence and digest skips when they're
 *  missing. */
export type LLMProvider = {
  findSupersedes?: (candidates: SupersedeCandidate[]) => Promise<SupersedePair[]>;
  judgeClusterMerge?: (a: ClusterSummary, b: ClusterSummary) => Promise<ClusterMergeJudgment>;
  dreamLimits: DreamLimits;
  dreamModel: string;
};
