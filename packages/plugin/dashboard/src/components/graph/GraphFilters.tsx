// Filter strip for the Graph view. Search + time chips + kind chips.
// Drops the layout dropdown — 3D force is the only mode now.

import { Search, X } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import type { GraphFilters as Filters } from "./types.ts";

// These size the zoom WINDOW (not the data fetch); the timeline always holds
// the full corpus and the window scrolls across it.
const TIME_CHIPS: Array<{ label: string; days: number | null }> = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "all", days: null },
];

export function GraphFilters({
  filters,
  onFilters,
  query,
  onQuery,
  knownKinds,
  viewDays,
  onViewDays,
}: {
  filters: Filters;
  onFilters: (next: Filters) => void;
  query: string;
  onQuery: (q: string) => void;
  knownKinds: string[];
  viewDays: number | null;
  onViewDays: (days: number | null) => void;
}) {
  const activeTime =
    viewDays === 1 ? "24h" : viewDays === 7 ? "7d" : viewDays === 30 ? "30d" : "all";

  function toggleKind(k: string) {
    const cur = filters.kind;
    const next = cur.includes(k) ? cur.filter((v) => v !== k) : cur.concat(k);
    onFilters({ ...filters, kind: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      <div className="relative flex h-7 min-w-[200px] max-w-md flex-1 items-center rounded-md border border-border/60 bg-transparent transition-colors focus-within:border-border focus-within:bg-card/50">
        <Search className="ml-2 h-3 w-3 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="search nodes"
          className="flex-1 bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground/60"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery("")}
            className="mr-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {TIME_CHIPS.map((t) => (
          <Chip key={t.label} active={activeTime === t.label} onClick={() => onViewDays(t.days)}>
            {t.label}
          </Chip>
        ))}
      </div>

      {knownKinds.length > 0 && (
        <div className="flex flex-wrap items-center gap-0.5">
          {knownKinds.map((k) => (
            <Chip key={k} active={filters.kind.includes(k)} onClick={() => toggleKind(k)}>
              {k}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-5 items-center rounded-full border px-2 text-[10px] transition-colors",
        active
          ? "border-foreground/30 bg-foreground/10 text-foreground"
          : "border-border/60 bg-transparent text-muted-foreground/70 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
