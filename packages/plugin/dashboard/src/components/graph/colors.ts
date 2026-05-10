// Shared kind → color mapping for the Graph view. Used by GraphCanvas
// (node rendering) and GraphLegend (color swatches) so the on-screen
// legend always matches what the canvas paints.

import type { GraphNode } from "./types.ts";

export const KIND_COLOR: Record<string, string> = {
  decision: "#38bdf8",
  discovery: "#a78bfa",
  feature: "#34d399",
  bugfix: "#fbbf24",
  reference: "#94a3b8",
  note: "#cbd5e1",
  constraint: "#fb923c",
  summary: "#22d3ee",
  preference: "#f472b6",
  security_alert: "#f87171",
  cluster: "#facc15",
};

export const FALLBACK_COLOR = "#94a3b8";

export function colorForNode(n: GraphNode): string {
  if (n.kind && KIND_COLOR[n.kind]) return KIND_COLOR[n.kind]!;
  return FALLBACK_COLOR;
}

export function colorForKind(kind: string): string {
  return KIND_COLOR[kind] ?? FALLBACK_COLOR;
}
