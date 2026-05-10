// Cytoscape.js mount with lazy import. Only the Graph tab pays the
// cytoscape download — the rest of the dashboard's bundle stays
// untouched. Renders a Skeleton while loading the lib, then mounts
// the cytoscape instance on a container div and pushes nodes + edges
// in via the cy.add API.
//
// Visual encoding follows the spec:
//   - Node color   = kind (matches the Memories row chip palette)
//   - Node size    = importance (radius 6→16)
//   - Selected     = sky ring border
//   - Superseded   = dashed muted border
//   - related edge = thin gray line
//   - supersede    = directed amber dashed arrow
//   - Cluster      = compound parent box with thicker border on the
//                    centroid memory

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn.ts";
import { Skeleton } from "../ui/skeleton.tsx";
import type { GraphEdge, GraphNode, LayoutName } from "./types.ts";

// Color palette per kind — mirrors the Memories row chip tone, just
// shifted to fill colors the cytoscape renderer can consume.
const KIND_COLOR: Record<string, string> = {
  decision: "#38bdf8",
  discovery: "#a78bfa",
  feature: "#34d399",
  bugfix: "#fbbf24",
  reference: "#94a3b8",
  note: "#94a3b8",
  constraint: "#fbbf24",
  summary: "#cbd5e1",
  preference: "#f472b6",
  security_alert: "#f87171",
};

function colorForKind(kind: string | null): string {
  if (!kind) return "#94a3b8";
  return KIND_COLOR[kind] ?? "#94a3b8";
}

function sizeForImportance(imp: number | null): number {
  const v = imp ?? 0;
  return 6 + Math.max(0, Math.min(1, v)) * 10;
}

export function GraphCanvas({
  nodes,
  edges,
  layout,
  query,
  selectedId,
  onSelect,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: LayoutName;
  query: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // The cytoscape instance + module references are held in refs so we
  // can rebuild on data updates without re-mounting the component.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cyRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cytoscapeModRef = useRef<any>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Lazy-load cytoscape + fcose layout extension ─────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cy, fcose] = await Promise.all([
          import("cytoscape"),
          import("cytoscape-fcose"),
        ]);
        if (cancelled) return;
        // Register fcose extension once.
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (cy.default as any).use(fcose.default);
        } catch {
          /* already registered (re-mount in dev) */
        }
        cytoscapeModRef.current = cy.default;
        setLoadState("ready");
      } catch (err) {
        if (cancelled) return;
        setLoadState("error");
        setLoadError(
          err instanceof Error ? err.message : String(err),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Mount + tear down cytoscape instance once the lib is ready ──
  useEffect(() => {
    if (loadState !== "ready") return;
    const container = containerRef.current;
    const cytoscape = cytoscapeModRef.current;
    if (!container || !cytoscape) return;

    const cy = cytoscape({
      container,
      wheelSensitivity: 0.2,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            width: "data(size)",
            height: "data(size)",
            label: "data(label)",
            color: "#94a3b8",
            "font-size": "8px",
            "text-valign": "bottom",
            "text-margin-y": 4,
            "text-wrap": "ellipsis",
            "text-max-width": "120px",
            "border-width": 1,
            "border-color": "#1f2937",
          },
        },
        {
          selector: "node[?superseded]",
          style: {
            "border-style": "dashed",
            "border-color": "#475569",
            opacity: 0.6,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 3,
            "border-color": "#0ea5e9",
          },
        },
        {
          selector: ":parent",
          style: {
            "background-color": "rgba(56, 189, 248, 0.04)",
            "border-color": "rgba(56, 189, 248, 0.25)",
            "border-width": 1,
            "border-style": "dashed",
            label: "data(label)",
            color: "#64748b",
            "font-size": "9px",
            "text-valign": "top",
            "text-halign": "center",
            "text-margin-y": -4,
            padding: 16,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "rgba(148, 163, 184, 0.25)",
            "curve-style": "haystack",
          },
        },
        {
          selector: "edge[type = 'supersede']",
          style: {
            width: 1.5,
            "line-color": "#fbbf24",
            "line-style": "dashed",
            "target-arrow-color": "#fbbf24",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
        {
          selector: ".dim",
          style: { opacity: 0.15 },
        },
      ],
    });

    cy.on("tap", "node", (evt: { target: { data: () => { id: string } } }) => {
      onSelect(evt.target.data().id);
    });
    cy.on("tap", (evt: { target: unknown }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((evt.target as any) === cy) {
        onSelect(null);
      }
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState]);

  // ── Push nodes + edges into cytoscape on data updates ────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Group memories by cluster so we can render compound parent
    // boxes for the cluster grouping.
    const clusterIds = new Set<string>();
    for (const n of nodes) {
      if (n.cluster_id) clusterIds.add(n.cluster_id);
    }

    const elements: Array<{
      group: "nodes" | "edges";
      data: Record<string, unknown>;
    }> = [];

    for (const cid of clusterIds) {
      elements.push({
        group: "nodes",
        data: {
          id: `cluster:${cid}`,
          label: `cluster ${cid.slice(0, 8)}`,
        },
      });
    }

    for (const n of nodes) {
      elements.push({
        group: "nodes",
        data: {
          id: n.id,
          parent: n.cluster_id ? `cluster:${n.cluster_id}` : undefined,
          label: n.content_preview.slice(0, 60),
          color: colorForKind(n.kind),
          size: sizeForImportance(n.importance),
          superseded: n.superseded,
          kind: n.kind,
          importance: n.importance,
        },
      });
    }
    for (const e of edges) {
      elements.push({
        group: "edges",
        data: {
          id: `${e.source}->${e.target}:${e.type}`,
          source: e.source,
          target: e.target,
          type: e.type,
        },
      });
    }

    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
    });

    const layoutOpts = layoutOptionsFor(layout);
    cy.layout(layoutOpts).run();
  }, [nodes, edges, layout]);

  // ── Search highlight ─────────────────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const q = query.trim().toLowerCase();
    cy.batch(() => {
      cy.elements().removeClass("dim");
      if (!q) return;
      cy.nodes().forEach(
        (
          node: {
            data: () => { label?: string };
            connectedEdges: () => { addClass: (c: string) => void };
            addClass: (c: string) => void;
          },
        ) => {
          const label = node.data().label ?? "";
          if (!label.toLowerCase().includes(q)) {
            node.addClass("dim");
            node.connectedEdges().addClass("dim");
          }
        },
      );
    });
  }, [query, nodes]);

  // ── Selected node visual sync (cytoscape uses :selected internally) ─
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (selectedId) {
      const n = cy.getElementById(selectedId);
      if (n.length > 0) {
        n.select();
      }
    }
  }, [selectedId]);

  if (loadState === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Skeleton className="h-32 w-32 rounded-full" />
        <span className="text-xs text-muted-foreground">
          Loading visualization library…
        </span>
      </div>
    );
  }
  if (loadState === "error") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <strong className="font-medium">Failed to load cytoscape</strong>
          <p className="mt-1 text-xs opacity-80">{loadError}</p>
        </div>
      </div>
    );
  }
  return (
    <div ref={containerRef} className={cn("h-full w-full bg-background")} />
  );
}

function layoutOptionsFor(layout: LayoutName): Record<string, unknown> {
  if (layout === "fcose") {
    return {
      name: "fcose",
      animate: true,
      animationDuration: 600,
      randomize: false,
      nodeRepulsion: 4500,
      idealEdgeLength: 70,
      edgeElasticity: 0.45,
      nestingFactor: 1.2,
      gravity: 0.25,
      tile: true,
      packComponents: true,
    };
  }
  if (layout === "circle") {
    return { name: "circle", animate: true, animationDuration: 400 };
  }
  if (layout === "grid") {
    return { name: "grid", animate: true, animationDuration: 400 };
  }
  return { name: "concentric", animate: true, animationDuration: 400 };
}
