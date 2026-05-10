import type { GraphResponse, LayoutName } from "./types.ts";

export function GraphFooter({
  stats,
  layout,
}: {
  stats: GraphResponse["stats"] | null;
  layout: LayoutName;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border bg-card/40 px-4 py-1.5 text-[10px] text-muted-foreground">
      {stats ? (
        <>
          <span className="tabular-nums">{stats.node_count} nodes</span>
          <span>·</span>
          <span className="tabular-nums">{stats.edge_count} edges</span>
          {stats.total_in_window > stats.node_count && (
            <>
              <span>·</span>
              <span className="tabular-nums">
                top {stats.node_count} of {stats.total_in_window}
              </span>
            </>
          )}
        </>
      ) : (
        <span>—</span>
      )}
      <span className="ml-auto uppercase tracking-wider opacity-70">
        {layout}
      </span>
    </div>
  );
}
