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

import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiGet } from "../lib/api.ts";
import { GraphCanvas } from "./graph/GraphCanvas.tsx";
import { GraphDetailDrawer } from "./graph/GraphDetailDrawer.tsx";
import { GraphFilters } from "./graph/GraphFilters.tsx";
import { GraphFooter } from "./graph/GraphFooter.tsx";
import { GraphLegend } from "./graph/GraphLegend.tsx";
import type {
  GraphEdge,
  GraphFilters as Filters,
  GraphNode,
  GraphResponse,
} from "./graph/types.ts";
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

function defaultFilters(): Filters {
  return {
    // Default "all": the timeline spans the full loaded corpus. The 24h/7d/
    // 30d chips set an explicit viewport span (see GraphCanvas domain).
    since: null,
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
  // The focal node's own data, captured at refocus time. The focal may have
  // come from the previous focus's egoExtra (not in the detail cache), so we
  // must keep it ourselves — otherwise replacing egoExtra drops the focal from
  // the scene (no node, no edges, drawer can't resolve it).
  const [focalNode, setFocalNode] = useState<GraphNode | null>(null);
  const [depth, setDepth] = useState(1);
  // Two data sources (no flicker, viewport controls unchanged):
  //   overview — sparse top-N across ALL time: feeds the scrubber's full-
  //              timeline mini-map + the domain extent. Fetched on filters.
  //   state    — DETAIL: top-N paginated by the visible viewport window, so
  //              zooming in loads more of what's actually on screen.
  const [overview, setOverview] = useState<GraphResponse | null>(null);
  const [state, setState] = useState<FetchState>({
    kind: "loading",
    previous: null,
  });
  // Visible window [minT, maxT] reported (debounced) by the canvas; the detail
  // fetch is paginated against it.
  const [win, setWin] = useState<{ minT: number; maxT: number } | null>(null);
  // Focus connections: the focused node's embedding nearest-neighbours, merged
  // into the scene so out-of-window connections appear (freed from time).
  const [egoExtra, setEgoExtra] = useState<{ nodes: GraphNode[]; edges: GraphResponse["edges"] }>({
    nodes: [],
    edges: [],
  });
  // In-flight flags for the top loading indicator (overview + focus fetches;
  // detail uses state.kind === "loading").
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [egoLoading, setEgoLoading] = useState(false);
  const [knownKinds, setKnownKinds] = useState<string[]>([]);
  // Detail cache: every window fetch accumulates here and is never dropped, so
  // panning back to an already-loaded region is instant (no refetch, no
  // re-removal). Cleared only when the non-time filters change. cacheVersion
  // bumps to recompute the merged node/edge lists.
  const cacheRef = useRef<{
    nodes: Map<string, GraphNode>;
    edges: Map<string, GraphResponse["edges"][number]>;
  }>({ nodes: new Map(), edges: new Map() });
  const [cacheVersion, setCacheVersion] = useState(0);
  const fgRef = useRef<any>(null);

  const abortRef = useRef<AbortController | null>(null);
  const overviewAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [query]);

  // Filter changes drop focal AND the detail cache — it's a different pool.
  useEffect(() => {
    setFocalId(null);
    setFocalNode(null);
    setDepth(1);
    cacheRef.current = { nodes: new Map(), edges: new Map() };
    setCacheVersion((v) => v + 1);
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

  function filterParams(): URLSearchParams {
    const p = new URLSearchParams();

    if (filters.repo.length) p.set("repo", filters.repo.join(","));
    if (filters.machine_id.length) p.set("machine_id", filters.machine_id.join(","));
    if (filters.kind.length) p.set("kind", filters.kind.join(","));

    return p;
  }

  // Overview: sparse all-time set for the scrubber mini-map + domain extent.
  // Refetched only when non-time filters change (not on pan/zoom).
  useEffect(() => {
    void fetchOverview();
  }, [filters.repo, filters.machine_id, filters.kind]);

  async function fetchOverview() {
    overviewAbortRef.current?.abort();
    const ac = new AbortController();

    overviewAbortRef.current = ac;
    setOverviewLoading(true);

    try {
      const params = filterParams();

      params.set("since", new Date(0).toISOString());
      params.set("top_n", "300");
      const data = await apiGet<GraphResponse>(`/graph?${params.toString()}`, {
        signal: ac.signal,
      });

      setOverview(data);
      setKnownKinds(() => {
        const set = new Set<string>();

        for (const n of data.nodes) if (n.kind) set.add(n.kind);

        return [...set].sort();
      });
    } catch {
      // Overview failure is non-fatal — scrubber/domain degrade gracefully.
    } finally {
      if (!ac.signal.aborted) setOverviewLoading(false);
    }
  }

  // Detail: paginated by the visible viewport window. Always the timeline
  // slice; focus (ego) connections are merged in separately (egoExtra below),
  // so focusing keeps the timeline behind it rather than replacing it.
  useEffect(() => {
    void fetchDetail();
  }, [filters, win]);

  async function fetchDetail() {
    // The canvas reports the window post-mount; nothing to paginate until then.
    if (!win) return;
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
      const params = filterParams();

      // Paginate detail by the visible window — zoom in loads more of what's on
      // screen rather than a global top-N. 1000 = server cap.
      params.set("since", new Date(win.minT).toISOString());
      params.set("until", new Date(win.maxT).toISOString());
      params.set("top_n", "1000");
      const data = await apiGet<GraphResponse>(`/graph?${params.toString()}`, {
        signal: ac.signal,
      });

      // Accumulate into the cache (never drop) so panning is free.
      for (const n of data.nodes) cacheRef.current.nodes.set(n.id, n);
      for (const e of data.edges)
        cacheRef.current.edges.set(`${e.source}|${e.target}|${e.type}`, e);
      setState({ kind: "ok", data, fetchedAt: Date.now() });
      setCacheVersion((v) => v + 1);
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

  // Focus neighbourhood: when a node is focused, fetch its REAL relationship
  // structure — cluster siblings (hub edges to the theme node), related_to
  // links, and supersede chain — and merge it into the scene. These are freed
  // from the timeline by the canvas, so out-of-window connections still appear.
  useEffect(() => {
    // Clear immediately so the previous focal's connections never linger while
    // the new fetch is in flight (caused stale nodes-without-edges on refocus).
    setEgoExtra({ nodes: [], edges: [] });

    if (!focalId) {
      setEgoLoading(false);

      return;
    }

    let cancelled = false;

    setEgoLoading(true);

    (async () => {
      try {
        const r = await apiGet<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
          `/memories/${focalId}/neighborhood`,
        );

        if (cancelled) return;
        // Drop the focal itself — it's kept separately as focalNode.
        setEgoExtra({
          nodes: r.nodes.filter((n) => n.id !== focalId),
          edges: r.edges,
        });
      } catch {
        if (!cancelled) setEgoExtra({ nodes: [], edges: [] });
      } finally {
        if (!cancelled) setEgoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [focalId]);

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

    // Background click (id=null) also exits focus.
    if (id === null && focalId) {
      setFocalId(null);
      setFocalNode(null);
      setDepth(1);
    }
  }

  // Canvas reports its visible window (already debounced there); it paginates
  // the detail fetch. Stable identity so it doesn't churn the canvas.
  const handleWindowChange = useCallback((minT: number, maxT: number) => {
    setWin((prev) => (prev && prev.minT === minT && prev.maxT === maxT ? prev : { minT, maxT }));
  }, []);

  function handleFocusClick() {
    // Clear focal → triggers fresh top-N fetch + auto-pick.
    setFocalId(null);
    setFocalNode(null);
    setDepth(1);
    setSelectedId(null);
  }

  // Recenter on a selected node — promote it to focal. Capture its data now
  // (it's a currently-rendered node) so it survives the egoExtra swap.
  function handleNodeRefocus(id: string) {
    const n =
      mergedNodes.find((m) => m.id === id) ?? overview?.nodes.find((m) => m.id === id) ?? null;

    setFocalNode(n);
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

  // Cached timeline detail + focus connections (deduped). The ego extras are
  // freed from time by the canvas; everything else stays on the timeline.
  const mergedNodes = useMemo(() => {
    const m = new Map<string, GraphNode>(cacheRef.current.nodes);

    // The focal must always be in the scene (it anchors every ego edge and the
    // drawer). It may not be in the cache if it came from a prior egoExtra.
    if (focalNode && !m.has(focalNode.id)) m.set(focalNode.id, focalNode);
    for (const n of egoExtra.nodes) if (!m.has(n.id)) m.set(n.id, n);

    return [...m.values()];
  }, [cacheVersion, egoExtra, focalNode]);

  const mergedEdges = useMemo(() => {
    const seen = new Set<string>(cacheRef.current.edges.keys());
    const out: GraphResponse["edges"] = [...cacheRef.current.edges.values()];

    for (const e of egoExtra.edges) {
      const k = `${e.source}|${e.target}|${e.type}`;

      if (!seen.has(k)) {
        seen.add(k);
        out.push(e);
      }
    }

    return out;
  }, [cacheVersion, egoExtra]);

  // Explicit focus set: the focal node + its fetched connections. Passed to
  // the canvas so the focus layout doesn't have to race-derive it from edges.
  const egoIds = useMemo<string[] | null>(() => {
    if (!focalId) return null;

    return [focalId, ...egoExtra.nodes.map((n) => n.id)];
  }, [focalId, egoExtra]);

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;

    return (
      mergedNodes.find((n) => n.id === selectedId) ??
      overview?.nodes.find((n) => n.id === selectedId) ??
      null
    );
  }, [selectedId, mergedNodes, overview]);

  // Any server fetch in flight → show the top loading indicator.
  const detailLoading = state.kind === "loading";
  const fetching = overviewLoading || detailLoading || egoLoading;
  const fetchLabel = egoLoading
    ? "loading connections…"
    : overviewLoading
      ? "loading graph…"
      : "fetching nodes…";

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
        {!overview && state.kind !== "error" && (
          <div className="flex h-full items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-32 w-32 rounded-full" />
              <span className="text-xs text-muted-foreground">Fetching graph…</span>
            </div>
          </div>
        )}

        {state.kind === "error" && !overview && (
          <div className="flex h-full items-center justify-center p-6">
            <Alert variant="destructive" className="max-w-md">
              <AlertTitle>Failed to load graph</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          </div>
        )}

        {overview && fetching && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/60 bg-card/85 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur">
            <Loader2 className="h-3 w-3 animate-spin text-foreground/70" />
            <span>{fetchLabel}</span>
          </div>
        )}

        {overview && (
          <>
            {state.kind === "stale" && (
              <Alert variant="warning" className="absolute left-3 top-3 z-10 max-w-md">
                <AlertTitle>Stale data</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            {/* Canvas stays mounted so it keeps reporting the viewport window
                that paginates the detail fetch. Detail nodes may be empty for a
                beat on first load / a sparse window. */}
            <GraphCanvas
              ref={fgRef}
              nodes={mergedNodes}
              edges={mergedEdges}
              overviewNodes={overview.nodes}
              egoIds={egoIds}
              query={debouncedQuery}
              selectedId={selectedId}
              focalId={focalId}
              onSelect={handleNodeSelect}
              onRefocus={handleNodeRefocus}
              onWindowChange={handleWindowChange}
            />
            <GraphDetailDrawer node={selectedNode} onClose={() => setSelectedId(null)} />
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
            <GraphLegend nodes={overview.nodes} />
          </>
        )}
      </div>

      <GraphFooter
        // Cache totals (everything loaded so far), not the last fetch — these
        // grow as you explore. Each window fetch caps at 1000; the cache
        // accumulates across windows.
        stats={
          mergedNodes.length
            ? {
                node_count: mergedNodes.length,
                edge_count: mergedEdges.length,
                total_in_window: data?.stats?.total_in_window ?? mergedNodes.length,
              }
            : null
        }
        depth={depth}
        focalId={focalId}
        onResetFocus={handleFocusClick}
      />
    </div>
  );
}
