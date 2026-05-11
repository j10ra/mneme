// 3D force graph (react-force-graph-3d, Three.js under the hood) of
// the memory corpus. Lazy-loaded — only the Graph tab pays the chunk
// download.
//
// Visual: neuron-like point sources. Each node is a tight emissive
// core with a soft glow sprite around it; UnrealBloomPass blooms the
// emissive layer for the "synapse firing in the dark" feel. Edges are
// thin animated particles to read as axonal flow.

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Skeleton } from "../ui/skeleton.tsx";
import { colorForNode } from "./colors.ts";
import type { GraphEdge, GraphNode } from "./types.ts";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function sizeForImportance(imp: number | null): number {
  const v = imp ?? 0;
  return 3 + Math.max(0, Math.min(1, v)) * 7;
}

type Force3DNode = GraphNode & { color: string; val: number; dim: boolean };
type Force3DLink = {
  source: string;
  target: string;
  type: GraphEdge["type"];
  color: string;
};

/** Build a radial-gradient sprite texture once and cache it.
 *  Used for the soft glow halo around each neuron node. */
let _glowTextureCache: unknown = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function glowTexture(THREE: any): unknown {
  if (_glowTextureCache) return _glowTextureCache;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.7)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.15)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  _glowTextureCache = tex;
  return tex;
}

export const GraphCanvas = forwardRef<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  {
    nodes: GraphNode[];
    edges: GraphEdge[];
    query: string;
    selectedId: string | null;
    focalId?: string | null;
    onSelect: (id: string | null) => void;
    onRefocus?: (id: string) => void;
  }
>(function GraphCanvas(
  { nodes, edges, query, selectedId, focalId, onSelect, onRefocus },
  externalRef,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ForceGraphRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const threeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bloomRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  useImperativeHandle(externalRef, () => fgRef.current);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  // Cache node objects by id so the force layout preserves positions
  // when a refetch arrives (depth bump). Without this, every fetch
  // hands fresh object references to the layout and it restarts from
  // a random distribution → flicker.
  const nodeCacheRef = useRef<Map<string, Force3DNode>>(new Map());
  // Tracks whether bloom has been attached to the composer; the
  // bloom-setup effect was running on every resize, stacking passes.
  const bloomAttachedRef = useRef(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panMode, setPanMode] = useState(false);

  // ── Lazy-load react-force-graph-3d + three + bloom pass ──────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rfg, three, bloom] = await Promise.all([
          import("react-force-graph-3d"),
          import("three"),
          import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
        ]);
        if (cancelled) return;
        ForceGraphRef.current = rfg.default;
        threeRef.current = three;
        bloomRef.current = bloom.UnrealBloomPass;
        setLoadState("ready");
      } catch (err) {
        if (cancelled) return;
        setLoadState("error");
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Container resize observer — bounding-rect-based for fractional
  // pixel correctness; also listens to window resize as a backstop.
  // Re-runs when loadState flips to "ready" so the observer attaches
  // to the real container (which doesn't exist in the DOM during the
  // loading-state render).
  useEffect(() => {
    if (loadState !== "ready") return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const w = Math.floor(r.width);
      const h = Math.floor(r.height);
      if (w > 0 && h > 0) {
        setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [loadState]);

  // Translate API data to react-force-graph shape, reusing cached
  // node objects by id so the force simulation keeps existing
  // positions on refetch. Fresh nodes (those not in the cache) are
  // pre-seeded with positions near the focal — without this they
  // get random initial coords from d3-force and "fly in" from
  // arbitrary spots, which read as a flicker when neighbors land
  // after a hop.
  const graphData = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cache = nodeCacheRef.current;
    const seen = new Set<string>();
    // Anchor for seeding fresh nodes: focal's current position if we
    // have one cached, else origin (landscape mode tends to centre on
    // origin anyway).
    const anchor = focalId ? cache.get(focalId) : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ax = (anchor as any)?.x ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ay = (anchor as any)?.y ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const az = (anchor as any)?.z ?? 0;
    const nodeOut: Force3DNode[] = nodes.map((n) => {
      const baseColor = colorForNode(n);
      const dim = q.length > 0 && !n.content_preview.toLowerCase().includes(q);
      seen.add(n.id);
      const cached = cache.get(n.id);
      if (cached) {
        // Mutate in place so the layout's references stay live.
        Object.assign(cached, {
          ...n,
          color: baseColor,
          val: sizeForImportance(n.importance),
          dim,
        });
        return cached;
      }
      const fresh: Force3DNode = {
        ...n,
        color: baseColor,
        val: sizeForImportance(n.importance),
        dim,
      };
      // Seed within a small jittered shell around the anchor so the
      // sim has a non-degenerate starting cloud (avoids overlap on
      // the same point but stays local to the focal).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fresh as any).x = ax + (Math.random() - 0.5) * 30;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fresh as any).y = ay + (Math.random() - 0.5) * 30;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fresh as any).z = az + (Math.random() - 0.5) * 30;
      cache.set(n.id, fresh);
      return fresh;
    });
    // Drop stale cached nodes that no longer appear in the response so
    // the cache doesn't grow unbounded across many filter changes.
    for (const id of cache.keys()) {
      if (!seen.has(id)) cache.delete(id);
    }
    const linkOut: Force3DLink[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      color: e.type === "supersede" ? "rgba(251, 191, 36, 0.85)" : "rgba(125, 211, 252, 0.32)",
    }));
    return { nodes: nodeOut, links: linkOut };
  }, [nodes, edges, query]);

  // Bloom + fog setup — runs once after canvas mounts. Keyed off
  // `bloomAttachedRef` so multiple renders don't stack passes.
  useEffect(() => {
    if (loadState !== "ready") return;
    if (bloomAttachedRef.current) return;
    const fg = fgRef.current;
    const THREE = threeRef.current;
    const UnrealBloomPass = bloomRef.current;
    if (!fg || !THREE || !UnrealBloomPass) return;

    const timer = setTimeout(() => {
      try {
        const composer = fg.postProcessingComposer?.();
        if (composer) {
          const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(size.w || 800, size.h || 600),
            0.55,
            0.4,
            0.4,
          );
          composer.addPass(bloomPass);
          bloomAttachedRef.current = true;
        }
        const scene = fg.scene?.();
        if (scene) {
          scene.fog = new THREE.FogExp2(0x05060a, 0.0009);
        }
      } catch {
        /* best-effort polish */
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [loadState]);

  // Hold-space-to-pan: swap OrbitControls' left-mouse binding from
  // ROTATE to PAN while space is held. Cursor switches to grab/grabbing
  // for visual feedback. Right-mouse-drag still pans regardless (the
  // OrbitControls default), this is just the DCC-style modifier.
  useEffect(() => {
    if (loadState !== "ready") return;
    const THREE = threeRef.current;
    if (!THREE) return;

    const isTypingTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      const fg = fgRef.current;
      const ctrls = fg?.controls?.();
      if (ctrls?.mouseButtons) {
        ctrls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      }
      setPanMode(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const fg = fgRef.current;
      const ctrls = fg?.controls?.();
      if (ctrls?.mouseButtons) {
        ctrls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      }
      setPanMode(false);
    };
    // Releasing focus (e.g., switching window) shouldn't strand us in
    // pan mode — reset on blur as a safety net.
    const onBlur = () => {
      const fg = fgRef.current;
      const ctrls = fg?.controls?.();
      if (ctrls?.mouseButtons) {
        ctrls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      }
      setPanMode(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [loadState]);

  // Camera focus on selection change. The effect lists graphData.nodes
  // as a dep so we can wait for a freshly-fetched node to land in the
  // dataset before flying — but we gate on `prevFlownIdRef` so we only
  // fly ONCE per actual selection change. Without the gate, every
  // refetch (which produces a fresh graphData.nodes reference) re-fires
  // the fly, even when the user's selectedId didn't change. That
  // double-fly looked like a flicker mid-transition.
  const prevFlownIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) {
      prevFlownIdRef.current = null;
      return;
    }
    if (prevFlownIdRef.current === selectedId) return;
    const fg = fgRef.current;
    if (!fg) return;
    const node = graphData.nodes.find((n) => n.id === selectedId);
    if (!node) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = node as any;
    if (typeof n.x !== "number") return;
    prevFlownIdRef.current = selectedId;
    const distance = 90;
    const distRatio = 1 + distance / Math.hypot(n.x, n.y, n.z);
    fg.cameraPosition(
      { x: n.x * distRatio, y: n.y * distRatio, z: n.z * distRatio },
      { x: n.x, y: n.y, z: n.z },
      900,
    );
  }, [selectedId, graphData.nodes]);

  if (loadState === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Skeleton className="h-32 w-32 rounded-full" />
        <span className="text-xs text-muted-foreground">Loading 3D visualization…</span>
      </div>
    );
  }
  if (loadState === "error") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <strong className="font-medium">Failed to load 3D graph</strong>
          <p className="mt-1 text-xs opacity-80">{loadError}</p>
        </div>
      </div>
    );
  }

  const ForceGraph = ForceGraphRef.current;
  const THREE = threeRef.current;
  const w = size.w > 0 ? size.w : 800;
  const h = size.h > 0 ? size.h : 600;

  // Neuron node: tight bright core sphere wrapped in a soft glow
  // sprite. Bloom amplifies the pair into the firing-synapse feel.
  // No labels on the canvas — the floating legend identifies colors,
  // and hover/drawer surface per-node detail.
  function makeNodeMesh(node: Force3DNode) {
    if (!THREE) return undefined;
    const isSelected = node.id === selectedId;
    const isFocal = focalId != null && node.id === focalId;
    const color = new THREE.Color(node.color);
    const group = new THREE.Group();

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(node.val * 0.35, 12, 12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: node.dim ? 0.25 : 1,
      }),
    );
    group.add(core);

    const glowTex = glowTexture(THREE) as unknown;
    const haloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color,
      transparent: true,
      opacity: node.dim ? 0.04 : isFocal ? 0.55 : isSelected ? 0.4 : 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Sprite(haloMat);
    const haloScale = node.val * (isFocal ? 3.6 : isSelected ? 3 : 2);
    halo.scale.set(haloScale, haloScale, 1);
    group.add(halo);

    return group;
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${panMode ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(20,28,48,0.95) 0%, rgba(5,6,10,1) 70%)",
      }}
    >
      {ForceGraph && (
        <ForceGraph
          ref={fgRef}
          graphData={graphData}
          width={w}
          height={h}
          backgroundColor="rgba(0,0,0,0)"
          nodeId="id"
          nodeVal="val"
          nodeLabel={(n: Force3DNode) =>
            `<div style="font: 11px ui-monospace,monospace; color:#e5e7eb; max-width:280px; padding:4px 6px; background:rgba(15,23,42,0.92); border:1px solid rgba(96,165,250,0.4); border-radius:4px"><strong style="color:#7dd3fc">${escapeHtml(n.kind ?? "memory")}</strong><br/>${escapeHtml(n.content_preview.slice(0, 200))}</div>`
          }
          nodeThreeObject={makeNodeMesh}
          nodeThreeObjectExtend={false}
          linkColor={(l: Force3DLink) => l.color}
          linkOpacity={0.5}
          linkWidth={(l: Force3DLink) => (l.type === "supersede" ? 1.5 : 0.4)}
          // Curve every edge so they read as axonal arcs in 3D rather
          // than ruler lines. Supersede edges arc more sharply so the
          // "newer truth" flow stands out from related neighbours.
          linkCurvature={(l: Force3DLink) => (l.type === "supersede" ? 0.4 : 0.25)}
          // Rotate each curve's plane around the edge axis by a hash
          // of the endpoint pair, so curves between dense clusters
          // don't all twist in the same plane and visually overlap.
          linkCurveRotation={(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            l: any,
          ) => {
            const sId = typeof l.source === "string" ? l.source : l.source?.id;
            const tId = typeof l.target === "string" ? l.target : l.target?.id;
            return ((hashStr(`${sId}-${tId}`) % 360) * Math.PI) / 180;
          }}
          linkDirectionalArrowLength={(l: Force3DLink) => (l.type === "supersede" ? 5 : 0)}
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowColor={(l: Force3DLink) => l.color}
          linkDirectionalParticles={0}
          enableNodeDrag={false}
          enableNavigationControls={true}
          showNavInfo={true}
          controlType="orbit"
          onNodeClick={(n: Force3DNode) => {
            // Click = hop. Refocus on this memory and open its drawer.
            // Right-click does the same; both are wired in case of OS
            // / trackpad quirks where right-click is awkward.
            if (onRefocus) onRefocus(n.id);
            else onSelect(n.id);
          }}
          onNodeRightClick={(n: Force3DNode) => {
            if (onRefocus) onRefocus(n.id);
          }}
          onBackgroundClick={() => onSelect(null)}
        />
      )}
    </div>
  );
});

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
