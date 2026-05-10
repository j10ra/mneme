// Shared types for the Memories panel and its child components.

export type MemoryRowData = {
  id: string;
  content: string;
  kind: string | null;
  repo: string | null;
  machine_id: string | null;
  machine_name: string | null;
  importance: number | null;
  created_at: string;
  cluster_id: string | null;
  superseded: boolean;
  score: number | null;
};

export type Filters = {
  /** ISO timestamp; null = no lower bound. */
  since: string | null;
  /** ISO timestamp; null = open to now. */
  until: string | null;
  repo: string[];
  machine_id: string[];
  kind: string[];
  cluster_status: string[];
};

export type RelatedRow = {
  id: string;
  content_preview: string;
  distance: number;
  kind: string | null;
};

export type ChainRow = {
  id: string;
  content_preview: string;
  kind: string | null;
  depth: number;
};

export type CaptureBody = {
  id: string;
  content: string;
  source: string;
  repo: string | null;
  captured_at: string;
  raw_meta: unknown;
};

export type ClusterSummary = {
  id: string;
  summary: string | null;
  member_count: number;
  last_at: string;
  sample_machine_ids: string[];
};
