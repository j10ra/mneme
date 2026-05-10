// Compact color legend for the Graph view. Renders only the kinds
// present in the currently-loaded node set so the legend stays tight
// and accurate to what's on screen.

import { KIND_COLOR } from "./colors.ts";
import type { GraphNode } from "./types.ts";

export function GraphLegend({ nodes }: { nodes: GraphNode[] }) {
  const kinds: string[] = [];
  const seen = new Set<string>();
  for (const n of nodes) {
    if (!n.kind || seen.has(n.kind)) continue;
    seen.add(n.kind);
    kinds.push(n.kind);
  }
  // Stable order: canonical kind list first, then anything novel.
  const canonical = Object.keys(KIND_COLOR);
  kinds.sort((a, b) => {
    const ai = canonical.indexOf(a);
    const bi = canonical.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  if (kinds.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-3 z-10 flex max-w-[280px] flex-wrap gap-x-2.5 gap-y-1.5 rounded-md border border-border/60 bg-card/80 px-2.5 py-2 text-[10px] text-muted-foreground backdrop-blur">
      {kinds.map((kind) => (
        <span key={kind} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: KIND_COLOR[kind] ?? "#94a3b8",
              boxShadow: `0 0 6px ${KIND_COLOR[kind] ?? "#94a3b8"}66`,
            }}
          />
          <span className="lowercase">{kind}</span>
        </span>
      ))}
    </div>
  );
}
