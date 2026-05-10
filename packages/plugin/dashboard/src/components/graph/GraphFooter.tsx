import type { GraphResponse } from "./types.ts";

export function GraphFooter({
  stats,
  depth,
  focalId,
  onResetFocus,
}: {
  stats: GraphResponse["stats"] | null;
  depth?: number;
  focalId?: string | null;
  onResetFocus?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border bg-card/40 px-4 py-1.5 text-[10px] text-muted-foreground">
      {stats ? (
        <>
          <span className="tabular-nums">{stats.node_count} nodes</span>
          <span>·</span>
          <span className="tabular-nums">{stats.edge_count} edges</span>
          {focalId && depth !== undefined && (
            <>
              <span>·</span>
              <span className="tabular-nums">
                depth {depth} from focal {focalId.slice(0, 8)}
              </span>
            </>
          )}
        </>
      ) : (
        <span>—</span>
      )}
      {focalId && onResetFocus && (
        <button
          type="button"
          onClick={onResetFocus}
          className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider hover:bg-muted/40 hover:text-foreground"
        >
          reset focus
        </button>
      )}
      <span className="ml-auto flex items-center gap-1.5 opacity-70">
        <kbd className="rounded border border-border/60 px-1 py-px font-mono text-[9px]">space</kbd>
        <span className="lowercase">pan · click hops</span>
      </span>
    </div>
  );
}
