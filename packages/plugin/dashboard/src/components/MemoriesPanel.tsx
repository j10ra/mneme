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
  // "Sticky" facets — accumulate every kind/repo/machine ever seen so
  // applying a filter chip doesn't make the other choices disappear.
  // Updated on every fetch via union with the response.
  const [knownKinds, setKnownKinds] = useState<Set<string>>(new Set());
  const [knownRepos, setKnownRepos] = useState<Set<string>>(new Set());
  const [knownMachines, setKnownMachines] = useState<Map<string, string>>(() => new Map());

  const abortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [query]);

  // Load initial page on filter / query change.
  useEffect(() => {
    void fetchPage(0, /* append */ false);
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
      if (filters.machine_id.length) params.set("machine_id", filters.machine_id.join(","));
      if (filters.kind.length) params.set("kind", filters.kind.join(","));
      if (filters.cluster_status.length)
        params.set("cluster_status", filters.cluster_status.join(","));
      if (debouncedQuery) params.set("q", debouncedQuery);

      const data = await apiGet<{ memories: MemoryRowData[] }>(`/memories?${params.toString()}`, {
        signal: ac.signal,
      });
      const got = data.memories.length;

      setHasMore(got >= PAGE_SIZE);
      // Union into the sticky facet sets so chips persist across filter
      // changes. Functional updaters keep this race-safe with overlapping
      // fetches.
      setKnownKinds((prev) => {
        let changed = false;
        const next = new Set(prev);

        for (const m of data.memories) {
          if (m.kind && !next.has(m.kind)) {
            next.add(m.kind);
            changed = true;
          }
        }

        return changed ? next : prev;
      });
      setKnownRepos((prev) => {
        let changed = false;
        const next = new Set(prev);

        for (const m of data.memories) {
          if (m.repo && !next.has(m.repo)) {
            next.add(m.repo);
            changed = true;
          }
        }

        return changed ? next : prev;
      });
      setKnownMachines((prev) => {
        let changed = false;
        const next = new Map(prev);

        for (const m of data.memories) {
          if (!m.machine_id) continue;
          const label = m.machine_name ?? m.machine_id.slice(0, 8);

          if (next.get(m.machine_id) !== label) {
            next.set(m.machine_id, label);
            changed = true;
          }
        }

        return changed ? next : prev;
      });
      setState((prev) => {
        const merged =
          append && prev.kind !== "loading" && prev.kind !== "error"
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
      { root: scrollRef.current, rootMargin: "200px" },
    );

    obs.observe(el);

    return () => obs.disconnect();
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
    <div className="flex h-full flex-col">
      {/* Header — fixed at the top of the panel; never scrolls. The
          scrollbar lives on the rows container below it instead of
          alongside the whole card, which would feel misleading. */}
      <div className="border-b border-border bg-card">
        <div className="px-6 pt-5 pb-3 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Memories</h2>
              <p className="text-xs text-muted-foreground">
                last 7d · all machines · click row to expand
              </p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {total > 0 ? `${total} loaded` : ""}
            </span>
          </div>

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
              knownKinds={knownKinds}
              knownRepos={knownRepos}
              knownMachines={knownMachines}
            />
          )}
        </div>
      </div>

      {/* Scrollable rows list — the only scroll surface in the panel.
          Uses bg-background (darker outer chrome tier) to match the
          LogsPanel rows surface. */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-background px-6 py-4">
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
              <ClusterGrouped grouped={grouped} expandedIds={expandedIds} onToggle={toggleExpand} />
            ) : (
              <Flat entries={entries} expandedIds={expandedIds} onToggle={toggleExpand} />
            )}
            {hasMore && (
              <div ref={sentinelRef} className="py-3 text-center text-xs text-muted-foreground">
                {loadingMore ? "Loading more…" : "scroll for more"}
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
  const toggle = (key: string) => () =>
    setCollapsed((prev) => {
      const next = new Set(prev);

      if (next.has(key)) next.delete(key);
      else next.add(key);

      return next;
    });

  return (
    <div className="space-y-3">
      {grouped.map(([cid, members]) => {
        const key = cid ?? "_orphaned";
        const isCollapsed = collapsed.has(key);

        // Orphaned group: no real cluster to encompass, so render as a
        // flat list with a thin standalone header. Keeps the visual
        // signal that real clusters carry weight while orphans don't.
        if (cid === null) {
          return (
            <div key={key} className="space-y-1">
              <ClusterHeader
                clusterId={cid}
                memberCount={members.length}
                collapsed={isCollapsed}
                onToggle={toggle(key)}
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
        }

        // Real cluster: encompassing card. The header lives as the
        // title bar of the card; members render inside an inset
        // region with subtle bg differentiation so it's visually
        // clear they belong to the cluster above.
        return (
          <div key={key} className="rounded-lg border border-border/70 bg-muted/10 overflow-hidden">
            <ClusterHeader
              clusterId={cid}
              memberCount={members.length}
              collapsed={isCollapsed}
              onToggle={toggle(key)}
              attached
            />
            {!isCollapsed && (
              <div className="border-t border-border/50 bg-background/40 p-2 space-y-1.5">
                {members.map((m) => (
                  <MemoryRow
                    key={m.id}
                    data={m}
                    expanded={expandedIds.has(m.id)}
                    onToggle={() => onToggle(m.id)}
                  />
                ))}
              </div>
            )}
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
