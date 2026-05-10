// Three-line chip-rich memory row + inline expanded shell.
//
// Click the row → toggles expand. Expand reveals tabbed sub-sections
// (Content+Meta default, Related, Chain, Cluster+Capture). Each tab
// fetches its data lazily on first open via MemoryExpand.

import { ChevronDown, ChevronRight, Layers, Link2 } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Badge } from "../ui/badge.tsx";
import { MemoryExpand } from "./MemoryExpand.tsx";
import type { MemoryRowData } from "./types.ts";

function fmtAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function repoShort(repo: string | null): string {
  if (!repo) return "—";
  // github.com/j10ra/mneme → j10ra/mneme
  const m = repo.match(/^github\.com\/(.+)$/);
  return m ? m[1]! : repo;
}

const KIND_TONE: Record<string, string> = {
  decision: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  discovery: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  feature: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  bugfix: "border-warning/40 bg-warning/10 text-warning",
  reference: "border-border bg-muted/40 text-muted-foreground",
  note: "border-border bg-muted/40 text-muted-foreground",
  constraint: "border-warning/40 bg-warning/10 text-warning",
  summary: "border-border bg-card text-foreground/80",
  preference: "border-pink-500/40 bg-pink-500/10 text-pink-400",
  security_alert: "border-destructive/50 bg-destructive/10 text-destructive",
};

export function MemoryRow({
  data,
  expanded,
  onToggle,
}: {
  data: MemoryRowData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const kindStyles =
    (data.kind && KIND_TONE[data.kind]) ?? "border-border bg-muted/40 text-muted-foreground";
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full text-left px-3 py-2 transition-colors hover:bg-muted/30",
          expanded && "bg-muted/40",
        )}
      >
        {/* Line 1: meta header */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="tabular-nums">{fmtAge(data.created_at)} ago</span>
          {data.kind && (
            <span
              className={cn(
                "inline-flex h-4 items-center rounded-sm border px-1 text-[9px] uppercase tracking-wider",
                kindStyles,
              )}
            >
              {data.kind}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2 text-muted-foreground">
            <span className="font-mono">{repoShort(data.repo)}</span>
            {data.machine_name && <span>· {data.machine_name}</span>}
          </span>
        </div>

        {/* Line 2: content preview */}
        <div className="mt-1 text-sm text-foreground/90 line-clamp-2 leading-snug">
          {data.content}
        </div>

        {/* Line 3: chips */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
          {data.cluster_id && (
            <Badge variant="secondary" className="gap-1">
              <Layers className="h-2.5 w-2.5" />
              cluster {data.cluster_id.slice(0, 8)}
            </Badge>
          )}
          {data.superseded && <Badge variant="warning">superseded</Badge>}
          {data.importance !== null && data.importance >= 0.7 && (
            <Badge variant="default">
              importance {data.importance.toFixed(2)}
            </Badge>
          )}
          {data.score !== null && (
            <Badge variant="secondary" className="gap-1">
              <Link2 className="h-2.5 w-2.5" />
              score {data.score.toFixed(2)}
            </Badge>
          )}
        </div>
      </button>

      {expanded && <MemoryExpand data={data} />}
    </div>
  );
}
