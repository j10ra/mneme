// Graph panel — third top-level dashboard tab. Renders a force-directed
// node-link visualization of the top-N most-connected memories within
// the active filters. Cytoscape.js + fcose layout, both lazy-loaded.
//
// Spec: docs/superpowers/specs/2026-05-10-graph-view-design.md

import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiGet } from "../lib/api.ts";
import { GraphCanvas } from "./graph/GraphCanvas.tsx";
import { GraphDetailDrawer } from "./graph/GraphDetailDrawer.tsx";
import { GraphFilters } from "./graph/GraphFilters.tsx";
import { GraphFooter } from "./graph/GraphFooter.tsx";
import type {
  GraphFilters as Filters,
  GraphResponse,
  LayoutName,
} from "./graph/types.ts";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
import { Skeleton } from "./ui/skeleton.tsx";

const SEARCH_DEBOUNCE_MS = 300;

type FetchState =
  | { kind: "loading" }
  | { kind: "ok"; data: GraphResponse; fetchedAt: number }
  | { kind: "stale"; data: GraphResponse; fetchedAt: number; error: string }
  | { kind: "error"; error: string };

const todayMinus = (days: number) => new Date(Date.now() - days * 86_400_000);

function defaultFilters(): Filters {
  return {
    since: todayMinus(30).toISOString(),
    until: null,
    repo: [],
    machine_id: [],
    kind: [],
  };
}

export function GraphPanel() {
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [layout, setLayout] = useState<LayoutName>("fcose");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const [knownKinds, setKnownKinds] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    void fetchGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function fetchGraph() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState({ kind: "loading" });

    try {
      const params = new URLSearchParams();
      params.set("top_n", "300");
      if (filters.since) params.set("since", filters.since);
      if (filters.until) params.set("until", filters.until);
      if (filters.repo.length) params.set("repo", filters.repo.join(","));
      if (filters.machine_id.length)
        params.set("machine_id", filters.machine_id.join(","));
      if (filters.kind.length) params.set("kind", filters.kind.join(","));

      const data = await apiGet<GraphResponse>(
        `/graph?${params.toString()}`,
        { signal: ac.signal },
      );
      // Track distinct kinds across fetches so chips persist across
      // filter selection (sticky-facets pattern from Memories panel).
      setKnownKinds((prev) => {
        const set = new Set<string>(prev);
        for (const n of data.nodes) {
          if (n.kind) set.add(n.kind);
        }
        return [...set].sort();
      });
      setState({ kind: "ok", data, fetchedAt: Date.now() });
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
              data: prev.data,
              fetchedAt: prev.fetchedAt,
              error: msg,
            }
          : { kind: "error", error: msg },
      );
    }
  }

  const data = state.kind === "ok" || state.kind === "stale" ? state.data : null;

  const selectedNode = useMemo(() => {
    if (!selectedId || !data) return null;
    return data.nodes.find((n) => n.id === selectedId) ?? null;
  }, [selectedId, data]);

  return (
    <div className="flex h-full flex-col">
      <GraphFilters
        filters={filters}
        onFilters={setFilters}
        query={query}
        onQuery={setQuery}
        layout={layout}
        onLayout={setLayout}
        knownKinds={knownKinds}
      />

      <div className="relative flex-1 min-h-0">
        {state.kind === "loading" && !data && (
          <div className="flex h-full items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-32 w-32 rounded-full" />
              <span className="text-xs text-muted-foreground">
                Fetching graph…
              </span>
            </div>
          </div>
        )}

        {state.kind === "error" && (
          <div className="flex h-full items-center justify-center p-6">
            <Alert variant="destructive" className="max-w-md">
              <AlertTitle>Failed to load graph</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          </div>
        )}

        {data && (
          <>
            {state.kind === "stale" && (
              <Alert
                variant="warning"
                className="absolute left-3 top-3 z-10 max-w-md"
              >
                <AlertTitle>Stale data</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            {data.nodes.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6">
                <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
                  No memories match the current filters.
                </div>
              </div>
            ) : (
              <GraphCanvas
                nodes={data.nodes}
                edges={data.edges}
                layout={layout}
                query={debouncedQuery}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
            <GraphDetailDrawer
              node={selectedNode}
              onClose={() => setSelectedId(null)}
            />
          </>
        )}
      </div>

      <GraphFooter stats={data?.stats ?? null} layout={layout} />
    </div>
  );
}
