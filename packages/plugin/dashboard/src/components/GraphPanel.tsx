// Graph panel — third top-level dashboard tab. Two modes:
//
//   Landscape (default): top-N most-connected memories from the filter
//     pool. No focal. Click any node to enter focused mode.
//
//   Focused: BFS from a chosen focal at the given depth. Click any
//     node to re-focus on it (depth resets to 1, camera flies). As
//     the user zooms out, depth bumps to load the next BFS hop —
//     debounced + monotonic so a single zoom doesn't cascade through
//     thresholds.
//
// Spec: docs/superpowers/specs/2026-05-10-graph-view-design.md

import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiGet } from "../lib/api.ts";
import { GraphCanvas } from "./graph/GraphCanvas.tsx";
import { GraphDetailDrawer } from "./graph/GraphDetailDrawer.tsx";
import { GraphFilters } from "./graph/GraphFilters.tsx";
import { GraphFooter } from "./graph/GraphFooter.tsx";
import { GraphLegend } from "./graph/GraphLegend.tsx";
import type { GraphFilters as Filters, GraphResponse } from "./graph/types.ts";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
import { Skeleton } from "./ui/skeleton.tsx";

const SEARCH_DEBOUNCE_MS = 300;
const MAX_HOPS = 6;
// Camera distance thresholds at which the next BFS hop loads. The
// fcose-style force layout keeps the focal near origin, so distance
// from the camera to origin tracks how far you've zoomed out.
const ZOOM_THRESHOLDS = [180, 320, 520, 780, 1100, 1500];

// `loading.previous` carries the last successfully-loaded graph so the
// canvas stays mounted during refetches. Without this, every hop or
// depth bump unmounted the entire <GraphCanvas/>, replaced it with a
// skeleton, and remounted it on response — the visible "flicker".
type FetchState =
  | { kind: "loading"; previous: GraphResponse | null }
  | { kind: "ok"; data: GraphResponse; fetchedAt: number }
  | { kind: "stale"; data: GraphResponse; fetchedAt: number; error: string }
  | { kind: "error"; error: string };

const todayMinus = (days: number) => new Date(Date.now() - days * 86_400_000);

function defaultFilters(): Filters {
  return {
    since: todayMinus(7).toISOString(),
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focalId, setFocalId] = useState<string | null>(null);
  const [depth, setDepth] = useState(1);
  const [state, setState] = useState<FetchState>({
    kind: "loading",
    previous: null,
  });
  const [knownKinds, setKnownKinds] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Filter changes drop focal — start over in landscape mode.
  useEffect(() => {
    setFocalId(null);
    setDepth(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Esc closes the drawer without resetting the focal — drawer is the
  // overlay, focal is the navigation state. Two separate things.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Refetch on filter / focal / depth change.
  useEffect(() => {
    void fetchGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, focalId, depth]);

  async function fetchGraph() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState((prev) => {
      const previous =
        prev.kind === "ok" || prev.kind === "stale"
          ? prev.data
          : prev.kind === "loading"
            ? prev.previous
            : null;
      return { kind: "loading", previous };
    });

    try {
      const params = new URLSearchParams();
      if (filters.since) params.set("since", filters.since);
      if (filters.until) params.set("until", filters.until);
      if (filters.repo.length) params.set("repo", filters.repo.join(","));
      if (filters.machine_id.length) params.set("machine_id", filters.machine_id.join(","));
      if (filters.kind.length) params.set("kind", filters.kind.join(","));
      if (focalId) {
        params.set("focal", focalId);
        params.set("hops", String(depth));
      } else {
        // Landscape mode: top-N most-connected memories within the
        // filter pool. Right-click a node to enter focused mode.
        params.set("top_n", "300");
      }

      const data = await apiGet<GraphResponse>(`/graph?${params.toString()}`, {
        signal: ac.signal,
      });
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

  // ── Camera-driven depth expansion ────────────────────────────────
  //
  // Polls the camera distance and computes the *target* depth the
  // user has zoomed out to, then bumps `depth` to that target in one
  // shot. This avoids the cascading bug where a single zoom-out
  // crossed all thresholds in sequence as each interval tick fired
  // a fresh +1 (six refetches in three seconds, flickering scene).
  //
  // Also debounces: requires the target to be stable for ~1s before
  // committing, so mid-zoom transients don't trigger refetches.
  useEffect(() => {
    if (!focalId) return;
    if (depth >= MAX_HOPS) return;
    let lastTarget = depth;
    let stableSince = 0;
    // Grace period after focal/depth change: don't bump while the
    // camera is still flying to the new focal. Without this, the
    // poll catches the OLD camera distance (still positioned over
    // the previous focal) and triggers a spurious second fetch.
    const startedAt = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - startedAt < 1500) return;
      const fg = fgRef.current;
      if (!fg) return;
      try {
        const pos = fg.cameraPosition?.();
        if (!pos) return;
        const dist = Math.hypot(pos.x ?? 0, pos.y ?? 0, pos.z ?? 0);
        // Number of thresholds crossed → target depth (1 = 1 hop).
        let target = 1;
        for (let i = 0; i < ZOOM_THRESHOLDS.length; i++) {
          if (dist > ZOOM_THRESHOLDS[i]) target = i + 2;
        }
        target = Math.min(MAX_HOPS, target);
        // Only EXPAND — zooming back in shouldn't shrink the loaded set.
        if (target <= depth) {
          stableSince = 0;
          return;
        }
        const now = Date.now();
        if (target !== lastTarget) {
          lastTarget = target;
          stableSince = now;
          return;
        }
        if (stableSince > 0 && now - stableSince > 1000) {
          setDepth(target);
          stableSince = 0;
        }
      } catch {
        /* best-effort */
      }
    }, 400);
    return () => clearInterval(interval);
  }, [focalId, depth]);

  function handleNodeSelect(id: string | null) {
    setSelectedId(id);
  }

  function handleFocusClick() {
    // Clear focal → triggers fresh top-N fetch + auto-pick.
    setFocalId(null);
    setDepth(1);
    setSelectedId(null);
  }

  // Recenter on a selected node — promote it to focal.
  function handleNodeRefocus(id: string) {
    setFocalId(id);
    setDepth(1);
    setSelectedId(id);
  }

  const data =
    state.kind === "ok" || state.kind === "stale"
      ? state.data
      : state.kind === "loading"
        ? state.previous
        : null;

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
        knownKinds={knownKinds}
      />

      <div className="relative h-full w-full min-h-0 flex-1">
        {state.kind === "loading" && !data && (
          <div className="flex h-full items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-32 w-32 rounded-full" />
              <span className="text-xs text-muted-foreground">Fetching graph…</span>
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
              <Alert variant="warning" className="absolute left-3 top-3 z-10 max-w-md">
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
                ref={fgRef}
                nodes={data.nodes}
                edges={data.edges}
                query={debouncedQuery}
                selectedId={selectedId}
                focalId={focalId}
                onSelect={handleNodeSelect}
                onRefocus={handleNodeRefocus}
              />
            )}
            <GraphDetailDrawer
              node={selectedNode}
              onClose={() => setSelectedId(null)}
              onRefocus={selectedNode ? () => handleNodeRefocus(selectedNode.id) : undefined}
            />
            {focalId && (
              <button
                type="button"
                onClick={handleFocusClick}
                title="back to landscape view"
                className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-md border border-border/60 bg-card/80 px-2.5 py-1.5 text-xs text-foreground backdrop-blur transition-colors hover:bg-muted/40"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>back to overview</span>
              </button>
            )}
            <GraphLegend nodes={data.nodes} />
          </>
        )}
      </div>

      <GraphFooter
        stats={data?.stats ?? null}
        depth={depth}
        focalId={focalId}
        onResetFocus={handleFocusClick}
      />
    </div>
  );
}
