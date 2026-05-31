// Filter strip for the Graph view. Search + kind chips. The window size/range
// is controlled entirely by the bottom scrubber (no time chips).

import { Search, X } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import type { GraphFilters as Filters } from "./types.ts";

export function GraphFilters({
  filters,
  onFilters,
  query,
  onQuery,
  knownKinds,
}: {
  filters: Filters;
  onFilters: (next: Filters) => void;
  query: string;
  onQuery: (q: string) => void;
  knownKinds: string[];
}) {
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
