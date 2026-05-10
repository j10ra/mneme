// Filter strip for the Graph view. Mirrors the Memories filter
// language but keeps independent state. Layout dropdown lets the
// user swap fcose / circle / grid / concentric — useful when fcose
// isn't reading well for a particular subset.

import { Search, X } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import type { GraphFilters as Filters, LayoutName } from "./types.ts";

const TIME_CHIPS: Array<{ label: string; days: number | null }> = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "all", days: null },
];

const LAYOUTS: Array<{ label: string; value: LayoutName }> = [
  { label: "fcose", value: "fcose" },
  { label: "concentric", value: "concentric" },
  { label: "circle", value: "circle" },
  { label: "grid", value: "grid" },
];

export function GraphFilters({
  filters,
  onFilters,
  query,
  onQuery,
  layout,
  onLayout,
  knownKinds,
}: {
  filters: Filters;
  onFilters: (next: Filters) => void;
  query: string;
  onQuery: (q: string) => void;
  layout: LayoutName;
  onLayout: (l: LayoutName) => void;
  knownKinds: string[];
}) {
  const activeTime = (() => {
    if (!filters.since) return "all";
    const ms = Date.now() - new Date(filters.since).getTime();
    const days = Math.round(ms / 86_400_000);
    if (days <= 1) return "24h";
    if (days <= 7) return "7d";
    if (days <= 30) return "30d";
    return "all";
  })();

  function setTime(days: number | null) {
    onFilters({
      ...filters,
      since:
        days === null
          ? null
          : new Date(Date.now() - days * 86_400_000).toISOString(),
    });
  }

  function toggleKind(k: string) {
    const cur = filters.kind;
    const next = cur.includes(k) ? cur.filter((v) => v !== k) : cur.concat(k);
    onFilters({ ...filters, kind: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border">
      <div className="relative flex h-7 items-center rounded-md border border-border/60 bg-transparent focus-within:border-border focus-within:bg-card/50 transition-colors min-w-[200px] flex-1 max-w-md">
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
          <Chip
            key={t.label}
            active={activeTime === t.label}
            onClick={() => setTime(t.days)}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      {knownKinds.length > 0 && (
        <div className="flex flex-wrap items-center gap-0.5">
          {knownKinds.map((k) => (
            <Chip
              key={k}
              active={filters.kind.includes(k)}
              onClick={() => toggleKind(k)}
            >
              {k}
            </Chip>
          ))}
        </div>
      )}

      <Select
        value={layout}
        onValueChange={(v) => onLayout(v as LayoutName)}
      >
        <SelectTrigger className="ml-auto min-w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LAYOUTS.map((l) => (
            <SelectItem key={l.value} value={l.value}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
