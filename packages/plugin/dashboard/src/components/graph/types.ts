// Shared types for the Graph view.

export type GraphNode = {
  id: string;
  content_preview: string;
  kind: string | null;
  importance: number | null;
  cluster_id: string | null;
  superseded: boolean;
  machine_id: string | null;
  machine_name: string | null;
  /** ISO timestamp — drives the timeline X position (oldest left, newest right). */
  created_at: string;
  /** Activity signal — drives node brightness (most-recalled lights up). */
  recall_weight: number | null;
  /** True when the memory is archived — rendered dimmest ("the archive"). */
  archived: boolean;
  /** Set in focal-mode responses: BFS depth from focal (0 = focal). */
  depth?: number | null;
};

export type GraphEdge = {
  source: string;
  target: string;
  type: "related" | "supersede";
};

export type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    node_count: number;
    edge_count: number;
    total_in_window: number;
  };
};

export type GraphFilters = {
  since: string | null;
  until: string | null;
  repo: string[];
  machine_id: string[];
  kind: string[];
};

export type LayoutName = "fcose" | "circle" | "grid" | "concentric";
