// Cluster header row, inserted between groups when "group by cluster"
// toggle is on. Click to collapse/expand the cluster's members.

import { ChevronDown, ChevronRight, Layers } from "lucide-react";

export function ClusterHeader({
  clusterId,
  memberCount,
  collapsed,
  onToggle,
}: {
  clusterId: string | null;
  memberCount: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-left text-xs hover:bg-muted/50 transition-colors"
    >
      {collapsed ? (
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      )}
      <Layers className="h-3 w-3 text-muted-foreground" />
      <span className="font-mono text-[11px]">
        {clusterId ? `cluster ${clusterId.slice(0, 8)}` : "(orphaned)"}
      </span>
      <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </span>
    </button>
  );
}
