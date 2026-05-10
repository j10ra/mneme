// Memories panel — third major content panel in the dashboard.
// Master + detail with inline expand. Read-only. Browse + hybrid
// search across all memories Mneme has accumulated, cross-machine.
//
// Spec: docs/superpowers/specs/2026-05-10-memories-panel-design.md

import { Layers, Search, Settings2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiGet } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { ClusterHeader } from "./memories/ClusterHeader.tsx";
import { MemoriesFilters } from "./memories/MemoriesFilters.tsx";
import { MemoryRow } from "./memories/MemoryRow.tsx";
import type { Filters, MemoryRowData } from "./memories/types.ts";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
import { Button } from "./ui/button.tsx";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card.tsx";
import { Skeleton } from "./ui/skeleton.tsx";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

type FetchState =
  | { kind: "loading" }
  | { kind: "ok"; entries: MemoryRowData[]; total: number; fetchedAt: number }
  | {
      kind: "stale";
      entries: MemoryRowData[];
      total: number;
      fetchedAt: number;
      error: string;
    }
  | { kind: "error"; error: string };

const todayMinus = (days: number) => new Date(Date.now() - days * 86_400_000);

function defaultFilters(): Filters {
  return {
    since: todayMinus(7).toISOString(),
    until: null,
    repo: [],
    machine_id: [],
    kind: [],
    cluster_status: [],
  };
}

export function MemoriesPanel() {
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [groupByCluster, setGroupByCluster] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Load initial page on filter / query change.
  useEffect(() => {
    void fetchPage(0, /* append */ false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debouncedQuery]);

  async function fetchPage(offset: number, append: boolean) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (append) setLoadingMore(true);
    else setState({ kind: "loading" });

    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (filters.since) params.set("since", filters.since);
      if (filters.until) params.set("until", filters.until);
      if (filters.repo.length) params.set("repo", filters.repo.join(","));
      if (filters.machine_id.length)
        params.set("machine_id", filters.machine_id.join(","));
      if (filters.kind.length) params.set("kind", filters.kind.join(","));
      if (filters.cluster_status.length)
        params.set("cluster_status", filters.cluster_status.join(","));
      if (debouncedQuery) params.set("q", debouncedQuery);

      const data = await apiGet<{ memories: MemoryRowData[] }>(
        `/memories?${params.toString()}`,
        { signal: ac.signal },
      );
      const got = data.memories.length;
      setHasMore(got >= PAGE_SIZE);
      setState((prev) => {
        const merged = append && prev.kind !== "loading" && prev.kind !== "error"
          ? prev.entries.concat(data.memories)
          : data.memories;
        return {
          kind: "ok",
          entries: merged,
          total: merged.length,
          fetchedAt: Date.now(),
        };
      });
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const msg =
        err instanceof ApiError
          ? `${err.status} ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      setState((prev) =>
        prev.kind === "ok" || prev.kind === "stale"
          ? {
              kind: "stale",
              entries: prev.entries,
              total: prev.total,
              fetchedAt: prev.fetchedAt,
              error: msg,
            }
          : { kind: "error", error: msg },
      );
    } finally {
      if (append) setLoadingMore(false);
    }
  }

  // Infinite scroll via IntersectionObserver on a sentinel div.
  useEffect(() => {
    if (state.kind !== "ok" || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          void fetchPage(state.entries.length, true);
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hasMore, loadingMore]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const entries = state.kind === "ok" || state.kind === "stale" ? state.entries : [];
  const total = state.kind === "ok" || state.kind === "stale" ? state.total : 0;

  const grouped = useMemo(() => {
    if (!groupByCluster) return null;
    const map = new Map<string | null, MemoryRowData[]>();
    for (const m of entries) {
      const key = m.cluster_id ?? null;
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [entries, groupByCluster]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <CardTitle>Memories</CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            {total > 0 ? `${total} loaded` : ""}
          </span>
        </div>
        <CardDescription>
          last 7d · all machines · click row to expand
        </CardDescription>
      </CardHeader>

      <div className="px-5 pb-3 space-y-3">
        {/* Search + toggles */}
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 flex-1 items-center rounded-md border border-border bg-card">
            <Search className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="hybrid search…"
              className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mr-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            variant={filtersOpen ? "active" : "ghost"}
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
            title="toggle filters"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={groupByCluster ? "active" : "ghost"}
            size="sm"
            onClick={() => setGroupByCluster((v) => !v)}
            title="group by cluster"
          >
            <Layers className="h-3.5 w-3.5" />
          </Button>
        </div>

        {filtersOpen && (
          <MemoriesFilters
            filters={filters}
            onChange={setFilters}
            entries={entries}
          />
        )}
      </div>

      <div className="px-5 pb-5">
        {state.kind === "loading" && <SkeletonRows />}
        {state.kind === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Failed to load memories</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {(state.kind === "ok" || state.kind === "stale") && (
          <>
            {state.kind === "stale" && (
              <Alert variant="warning" className="mb-3">
                <AlertTitle>Stale data</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            {entries.length === 0 ? (
              <Empty>No memories match the current filters.</Empty>
            ) : grouped ? (
              <ClusterGrouped
                grouped={grouped}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
              />
            ) : (
              <Flat
                entries={entries}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
              />
            )}
            {hasMore && (
              <div
                ref={sentinelRef}
                className="py-3 text-center text-xs text-muted-foreground"
              >
                {loadingMore ? "Loading more…" : "scroll for more"}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function Flat({
  entries,
  expandedIds,
  onToggle,
}: {
  entries: MemoryRowData[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {entries.map((m) => (
        <MemoryRow
          key={m.id}
          data={m}
          expanded={expandedIds.has(m.id)}
          onToggle={() => onToggle(m.id)}
        />
      ))}
    </div>
  );
}

function ClusterGrouped({
  grouped,
  expandedIds,
  onToggle,
}: {
  grouped: Array<[string | null, MemoryRowData[]]>;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  return (
    <div className="space-y-3">
      {grouped.map(([cid, members]) => {
        const key = cid ?? "_orphaned";
        const isCollapsed = collapsed.has(key);
        return (
          <div key={key} className="space-y-1">
            <ClusterHeader
              clusterId={cid}
              memberCount={members.length}
              collapsed={isCollapsed}
              onToggle={() =>
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
            />
            {!isCollapsed &&
              members.map((m) => (
                <MemoryRow
                  key={m.id}
                  data={m}
                  expanded={expandedIds.has(m.id)}
                  onToggle={() => onToggle(m.id)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}
