// Right-side detail drawer for the Graph view. Slides in when a node is
// selected. Reuses MemoryExpand so its tabs (Content+Meta, All Fields,
// Related, Chain, Cluster+Capture) work identically to the Memories table's
// inline expand.

import { X } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { MemoryExpand } from "../memories/MemoryExpand.tsx";
import type { MemoryRowData } from "../memories/types.ts";
import type { GraphNode } from "./types.ts";

export function GraphDetailDrawer({
  node,
  onClose,
}: {
  node: GraphNode | null;
  onClose: () => void;
}) {
  return (
    <aside
      className={cn(
        "absolute right-0 top-0 bottom-0 w-[360px] border-l border-border bg-card transition-transform duration-200",
        node ? "translate-x-0" : "translate-x-full pointer-events-none",
      )}
    >
      {node && (
        <>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              {node.kind && (
                <span className="rounded-sm border border-border/60 bg-card px-1 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                  {node.kind}
                </span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground">
                {node.id.slice(0, 8)}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex h-[calc(100%-37px)] flex-col overflow-y-auto">
            <MemoryExpand data={nodeToMemoryRow(node)} />
          </div>
        </>
      )}
    </aside>
  );
}

/** GraphNode is a thin slice of MemoryRowData — pad it back out so
 *  MemoryExpand can render. The fields it doesn't have stay as their
 *  empty/null defaults; the lazy-fetch tabs (all fields, related, chain,
 *  capture) fetch fresh data by id anyway. */
function nodeToMemoryRow(n: GraphNode): MemoryRowData {
  return {
    id: n.id,
    content: n.content_preview,
    kind: n.kind,
    repo: null,
    machine_id: n.machine_id,
    machine_name: n.machine_name,
    importance: n.importance,
    created_at: new Date().toISOString(),
    cluster_id: n.cluster_id,
    superseded: n.superseded,
    score: null,
  };
}
