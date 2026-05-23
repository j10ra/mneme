// Cluster header row, inserted between groups when "group by cluster"
// toggle is on. Click to collapse/expand the cluster's members.
//
// When `attached` is true the header lives as the title bar of an
// outer card (no own border, the wrapping card draws the boundary).
// When false it's a standalone pill — used for the orphaned group
// where there is no real cluster to encompass.

import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { cn } from "../../lib/cn.ts";

export function ClusterHeader({
  clusterId,
  memberCount,
  collapsed,
  onToggle,
  attached = false,
}: {
  clusterId: string | null;
  memberCount: number;
  collapsed: boolean;
  onToggle: () => void;
  attached?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
        attached
          ? "bg-muted/40 hover:bg-muted/60"
          : "rounded-md border border-border/60 bg-muted/20 hover:bg-muted/40",
      )}
    >
      {collapsed ? (
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      )}
      <Layers
        className={cn("h-3 w-3", attached ? "text-foreground/70" : "text-muted-foreground")}
      />
      <span className={cn("font-mono text-[11px]", attached && "text-foreground/90 font-semibold")}>
        {clusterId ? `cluster ${clusterId.slice(0, 8)}` : "(orphaned)"}
      </span>
      <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </span>
    </button>
  );
}
