// Living timeline canvas of the memory corpus.
//
// Layout: a d3-force simulation with X *pinned to time* (forceX toward the
// node's created_at position under the current viewport) while Y floats —
// nodes pull toward their kind lane but a collision force spreads them so
// dense time-clusters declutter vertically. The sim animates on load, on
// refetch, and on every viewport change, so the graph feels alive rather
// than static; a tiny per-node bob keeps it gently breathing at idle.
//
// Interaction:
//   - drag horizontally  → pan the time window (expand into older/newer)
//   - wheel              → zoom the time axis in/out around the cursor
//   - click a node       → select + smoothly centre it (drawer opens)
//   - double-click       → refocus (drill into its BFS neighbourhood)
//
// X = time (oldest left, now right), Y = kind lanes, opacity = importance
// (most important light up, less important dim; archived faintest). No glow.
// Edges are static arcs that follow the nodes. Same props as before, so
// GraphPanel is unchanged.

import { forceCollide, forceSimulation, forceX, forceY, type Simulation } from "d3-force";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { colorForNode, KIND_COLOR } from "./colors.ts";
import type { GraphEdge, GraphNode } from "./types.ts";

const PAD = { top: 18, right: 28, bottom: 34, left: 124 };
const KIND_ORDER = Object.keys(KIND_COLOR);
const TWEEN_MS = 550;
const FADE_MS = 380; // node enter/exit fade on detail refetch
const MIN_SPAN_MS = 60 * 60 * 1000; // 1h — max zoom-in
const MAX_SPAN_MS = 10 * 365 * 86_400_000; // 10y — max zoom-out
// Bottom scrubber: a full-width overview of the entire timeline with a
// draggable window that sets the main chart's zoom (shrink window = zoom in).
const BRUSH_H = 38;
const BRUSH_GAP = 16;
const HANDLE_HIT = 9;

type View = { minT: number; maxT: number };
type Tween = { from: View; to: View; start: number } | null;

type SimNode = {
  id: string;
  node: GraphNode;
  t: number;
  laneIdx: number;
  r: number;
  color: string;
  bright: number;
  phase: number; // idle-bob phase
  appearAt: number; // perf-clock ms when first loaded (drives fade-in)
  present: boolean; // in the current detail set
  leavingAt?: number; // perf-clock ms when it left the set (drives fade-out)
  egoX?: number; // focus-stage X target (even spread within lane); else time-X
  x: number;
  y: number;
  vx?: number;
  vy?: number;
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function radiusForImportance(imp: number | null): number {
  return 2.5 + Math.max(0, Math.min(1, imp ?? 0)) * 5.5;
}
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
function hexToRgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const int = Number.parseInt(m[1] as string, 16);
  return `rgba(${(int >> 16) & 255},${(int >> 8) & 255},${int & 255},${a})`;
}

export const GraphCanvas = forwardRef<
  unknown,
  {
    /** DETAIL nodes — paginated by the visible window; rendered in the main
     *  chart. May lag/empty for a beat while a window refetch is in flight. */
    nodes: GraphNode[];
    edges: GraphEdge[];
    /** OVERVIEW nodes — sparse, all-time. Drive the scrubber mini-map, the kind
     *  lanes, and the full-timeline domain (so the scrubber spans everything
     *  even though the main chart only loads the window). */
    overviewNodes: GraphNode[];
    query: string;
    selectedId: string | null;
    focalId?: string | null;
    /** Viewport window SIZE in days (24h=1, 7d=7, 30d=30 chips); null = "all"
     *  (whole data span). The scrubber's domain is always the full data span;
     *  this only sizes the zoom window, which can scroll across all history. */
    viewDays: number | null;
    onSelect: (id: string | null) => void;
    onRefocus?: (id: string) => void;
    /** Reports the visible window (already debounced) so the parent can
     *  paginate the detail fetch against it. */
    onWindowChange?: (minT: number, maxT: number) => void;
  }
>(function GraphCanvas(
  {
    nodes,
    edges,
    overviewNodes,
    query,
    selectedId,
    focalId,
    viewDays,
    onSelect,
    onRefocus,
    onWindowChange,
  },
  externalRef,
) {
  useImperativeHandle(externalRef, () => ({}), []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const [hover, setHover] = useState<{
    kind: string;
    preview: string;
    archived: boolean;
    cx: number;
    cy: number;
  } | null>(null);

  // Mutable render/sim state kept in refs so the rAF loop reads live values
  // without re-subscribing.
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const viewRef = useRef<View | null>(null);
  // Full timeline domain (every loaded node) — the scrubber's fixed extent.
  const fullRef = useRef<View | null>(null);
  const tweenRef = useRef<Tween>(null);
  const edgesRef = useRef<GraphEdge[]>(edges);
  const selectedRef = useRef<string | null>(selectedId);
  const focalRef = useRef<string | null | undefined>(focalId);
  const queryRef = useRef(query);
  const rafRef = useRef<number | null>(null);
  const onWindowChangeRef = useRef(onWindowChange);
  const reportTimerRef = useRef<number | null>(null);
  // Precomputed scrubber mini-map points (from the all-time overview); the rAF
  // render reads this ref. x is computed per-frame via xFull (size-dependent).
  const miniRef = useRef<Array<{ t: number; lf: number; color: string; bright: number }>>([]);

  edgesRef.current = edges;
  selectedRef.current = selectedId;
  focalRef.current = focalId;
  queryRef.current = query;
  onWindowChangeRef.current = onWindowChange;

  // Lanes derive from the OVERVIEW (all kinds, stable) so they don't reshuffle
  // as the windowed detail set changes.
  const lanes = useMemo(() => {
    const present = new Set<string>();
    for (const n of overviewNodes) present.add(n.kind ?? "other");
    for (const n of nodes) present.add(n.kind ?? "other");
    const ordered: string[] = [];
    for (const k of KIND_ORDER) if (present.has(k)) ordered.push(k);
    for (const k of present) if (!ordered.includes(k)) ordered.push(k);
    const index = new Map<string, number>();
    ordered.forEach((k, i) => index.set(k, i));
    return { ordered, index };
  }, [overviewNodes, nodes]);
  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;

  // ── geometry helpers (read live refs) ────────────────────────────
  function plotW() {
    return Math.max(1, sizeRef.current.w - PAD.left - PAD.right);
  }
  function lanesBottom() {
    return sizeRef.current.h - PAD.bottom - BRUSH_H - BRUSH_GAP;
  }
  function laneCenterY(laneIdx: number): number {
    const plotH = Math.max(1, lanesBottom() - PAD.top);
    const laneH = plotH / Math.max(1, lanesRef.current.ordered.length);
    return PAD.top + (laneIdx + 0.5) * laneH;
  }
  function xForTime(t: number): number {
    const v = viewRef.current;
    if (!v) return PAD.left;
    return PAD.left + ((t - v.minT) / (v.maxT - v.minT || 1)) * plotW();
  }
  function timeForX(px: number): number {
    const v = viewRef.current;
    if (!v) return Date.now();
    return v.minT + ((px - PAD.left) / plotW()) * (v.maxT - v.minT);
  }
  // Scrubber band geometry (full-domain X scale).
  function brushTop() {
    return sizeRef.current.h - PAD.bottom - BRUSH_H;
  }
  function xFull(t: number): number {
    const f = fullRef.current;
    if (!f) return PAD.left;
    return PAD.left + ((t - f.minT) / (f.maxT - f.minT || 1)) * plotW();
  }
  function timeFullForX(px: number): number {
    const f = fullRef.current;
    if (!f) return Date.now();
    return f.minT + ((px - PAD.left) / plotW()) * (f.maxT - f.minT);
  }

  function inWindow(t: number): boolean {
    const v = viewRef.current;
    if (!v) return true;
    const m = (v.maxT - v.minT) * 0.03; // small margin so edge nodes show
    return t >= v.minT - m && t <= v.maxT + m;
  }
  // The focused node + its directly-connected neighbours. On focus these are
  // freed from the timeline (shown regardless of window, pulled toward centre).
  function egoIds(): Set<string> | null {
    const id = focalRef.current;
    if (!id) return null;
    const s = new Set<string>([id]);
    for (const e of edgesRef.current) {
      if (e.source === id) s.add(e.target);
      else if (e.target === id) s.add(e.source);
    }
    return s;
  }
  // The visible viewport = the nodes inside the scrubber window. Re-seeding
  // sim.nodes() to that subset both (a) makes the chart show exactly the
  // windowed set zoomed to fill the width and (b) re-initialises forceX so
  // its cached per-node X targets pick up the new viewport (the zoom). The
  // sim is ticked manually from the rAF loop (created with .stop()), so we
  // only raise alpha here — never .restart() (that would double-tick).
  function applyWindow(alpha = 0.4) {
    const sim = simRef.current;
    if (!sim) return;
    // Focus is a separate stage: show ONLY the focal node + its connections.
    // Otherwise (timeline) window-cull as usual.
    const ego = egoIds();
    const subset = ego
      ? [...simNodesRef.current.values()].filter((n) => n.present && ego.has(n.id))
      : [...simNodesRef.current.values()].filter((n) => n.present && inWindow(n.t));
    sim.nodes(subset);
    sim.alpha(Math.max(sim.alpha(), alpha));
    reportWindow();
  }
  // Debounced report of the visible window up to the parent, which paginates
  // the detail fetch against it. Debounced so dragging/zooming doesn't refetch
  // on every frame; the parent also dedupes identical windows.
  function reportWindow() {
    if (reportTimerRef.current != null) clearTimeout(reportTimerRef.current);
    reportTimerRef.current = window.setTimeout(() => {
      const v = viewRef.current;
      if (v) onWindowChangeRef.current?.(v.minT, v.maxT);
    }, 240);
  }
  function tweenTo(to: View) {
    const from = viewRef.current;
    if (!from) {
      viewRef.current = to;
      return;
    }
    tweenRef.current = { from: { ...from }, to, start: performance.now() };
  }

  // ── resize observer ──────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const w = Math.floor(r.width);
      const h = Math.floor(r.height);
      if (w > 0 && h > 0) setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── (re)build sim nodes whenever data/size/query changes ─────────
  useEffect(() => {
    const { w, h } = size;
    if (w === 0 || h === 0) return;

    // Domain extent (scrubber span) comes from the OVERVIEW — the full data
    // start/end — not the windowed detail set. Fall back to detail if the
    // overview hasn't arrived yet.
    let minT = Number.POSITIVE_INFINITY;
    let maxT = Number.NEGATIVE_INFINITY;
    for (const n of overviewNodes.length ? overviewNodes : nodes) {
      const t = Date.parse(n.created_at);
      if (Number.isFinite(t)) {
        if (t < minT) minT = t;
        if (t > maxT) maxT = t;
      }
    }
    const now = Date.now();
    if (!Number.isFinite(minT)) {
      minT = now - 86_400_000;
      maxT = now;
    }
    // The scrubber domain is ALWAYS the full data span (start of data → now),
    // so the window can scroll across all history. The chip only sizes the
    // zoom window: 24h/7d/30d → a span ending at "now" (clamped to the domain),
    // "all" → the whole domain. Refit the window on first load, chip change, or
    // focal change; plain refetches keep the user's pan/zoom.
    const domain: View = { minT, maxT: maxT > minT ? maxT : now };
    fullRef.current = domain;
    const windowFor = (): View => {
      if (viewDays == null) return domain;
      const span = viewDays * 86_400_000;
      return clampView({ minT: now - span, maxT: now });
    };
    const chipChanged = viewDays !== prevViewDaysRef.current;
    if (!viewRef.current) viewRef.current = windowFor();
    else if (chipChanged || focalRef.current !== prevFocalRef.current) tweenTo(windowFor());
    prevViewDaysRef.current = viewDays;
    prevFocalRef.current = focalRef.current;

    const q = query.trim().toLowerCase();
    const nowPerf = performance.now();
    const next = new Map<string, SimNode>();
    for (const n of nodes) {
      const t = Date.parse(n.created_at);
      const ft = Number.isFinite(t) ? t : maxT;
      const laneIdx = lanes.index.get(n.kind ?? "other") ?? 0;
      // Opacity encodes importance: the most important light up, the less
      // important dim down. Archived stay faintest. (No glow — opacity only.)
      const imp = Math.max(0, Math.min(1, n.importance ?? 0));
      let bright = n.archived ? 0.1 : 0.22 + 0.78 * imp;
      if (q.length > 0 && !n.content_preview.toLowerCase().includes(q)) bright *= 0.15;
      const prev = simNodesRef.current.get(n.id);
      const sn: SimNode = prev ?? {
        id: n.id,
        node: n,
        t: ft,
        laneIdx,
        r: radiusForImportance(n.importance),
        color: colorForNode(n),
        bright,
        phase: (hashStr(n.id) % 628) / 100,
        appearAt: nowPerf, // new node → fade in
        present: true,
        x: xForTime(ft),
        y: laneCenterY(laneIdx) + ((hashStr(n.id) % 1000) / 1000 - 0.5) * 24,
      };
      // refresh mutable visual fields on existing nodes
      sn.node = n;
      sn.t = ft;
      sn.laneIdx = laneIdx;
      sn.r = radiusForImportance(n.importance);
      sn.color = colorForNode(n);
      sn.bright = bright;
      sn.present = true;
      sn.leavingAt = undefined; // re-entered before fade-out completed
      next.set(n.id, sn);
    }
    // Carry over recently-removed nodes so they fade OUT instead of popping.
    // Dropped once their fade window elapses.
    for (const [id, sn] of simNodesRef.current) {
      if (next.has(id)) continue;
      const leftAt = sn.leavingAt ?? nowPerf;
      if (nowPerf - leftAt < FADE_MS) {
        sn.present = false;
        sn.leavingAt = leftAt;
        next.set(id, sn);
      }
    }
    simNodesRef.current = next;

    const sim =
      simRef.current ??
      forceSimulation<SimNode>().velocityDecay(0.45).alphaDecay(0.025).alphaMin(0.001).stop();
    simRef.current = sim;
    // Focus keeps the SAME lane layout (bug/feature/…) but makes the whole
    // viewport about the selected node: it's pinned at centre, and its
    // connections are freed from time and pushed apart (charge) so they spread
    // out and fill the space — each still held to its kind lane.
    const focusId = focalRef.current;
    const egoSet = new Set<string>();
    if (focusId) {
      egoSet.add(focusId);
      for (const e of edges) {
        if (e.source === focusId) egoSet.add(e.target);
        else if (e.target === focusId) egoSet.add(e.source);
      }
    }
    // Focus-stage X targets: spread the focused set EVENLY ACROSS THE WIDTH
    // within each kind lane, so it fills the viewport while staying organised
    // by lane (charge-repulsion scattered the lanes — don't use it here).
    for (const sn of next.values()) sn.egoX = undefined;
    if (focusId) {
      const byLane = new Map<number, SimNode[]>();
      for (const sn of next.values()) {
        if (!egoSet.has(sn.id)) continue;
        const arr = byLane.get(sn.laneIdx) ?? [];
        arr.push(sn);
        byLane.set(sn.laneIdx, arr);
      }
      const left = PAD.left + 24;
      const span = Math.max(1, w - PAD.right - 24 - left);
      for (const arr of byLane.values()) {
        arr.sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
        arr.forEach((sn, j) => {
          sn.egoX = arr.length === 1 ? left + span / 2 : left + (j / (arr.length - 1)) * span;
        });
      }
    }
    sim
      .force(
        "x",
        forceX<SimNode>((d) =>
          egoSet.has(d.id) ? (d.egoX ?? xForTime(d.t)) : xForTime(d.t),
        ).strength(0.5),
      )
      // Strong lane pull in focus so the kind rows stay clean; gentle on the
      // timeline (collide does the vertical declutter there).
      .force(
        "y",
        forceY<SimNode>((d) => laneCenterY(d.laneIdx)).strength((d) =>
          egoSet.has(d.id) ? 0.5 : 0.06,
        ),
      )
      .force(
        "collide",
        forceCollide<SimNode>((d) => d.r + (egoSet.has(d.id) ? 4 : 2))
          .strength(1)
          .iterations(4),
      );
    applyWindow(0.7);
  }, [nodes, overviewNodes, size, query, lanes, viewDays, edges]);

  const prevFocalRef = useRef<string | null | undefined>(focalId);
  const prevViewDaysRef = useRef<number | null>(viewDays);

  // Build the scrubber mini-map point list from the overview (size-independent
  // fields; x derived per-frame). Kept off the rAF hot path.
  useEffect(() => {
    const nL = Math.max(1, lanes.ordered.length);
    miniRef.current = overviewNodes.flatMap((n) => {
      const t = Date.parse(n.created_at);
      if (!Number.isFinite(t)) return [];
      const li = lanes.index.get(n.kind ?? "other") ?? 0;
      const imp = Math.max(0, Math.min(1, n.importance ?? 0));
      return [
        {
          t,
          lf: nL > 1 ? li / (nL - 1) : 0.5,
          color: colorForNode(n),
          bright: n.archived ? 0.12 : 0.3 + 0.7 * imp,
        },
      ];
    });
  }, [overviewNodes, lanes]);

  // ── render loop (rAF) ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function frame(ts: number) {
      const { w, h } = sizeRef.current;
      const sim = simRef.current;
      const v = viewRef.current;
      // advance viewport tween
      const tw = tweenRef.current;
      if (tw) {
        const k = Math.min(1, (ts - tw.start) / TWEEN_MS);
        const e = easeInOut(k);
        viewRef.current = {
          minT: tw.from.minT + (tw.to.minT - tw.from.minT) * e,
          maxT: tw.from.maxT + (tw.to.maxT - tw.from.maxT) * e,
        };
        if (k >= 1) tweenRef.current = null;
        applyWindow(0.3); // re-subset + re-init forceX as the view eases
      }
      if (sim && (sim.alpha() > sim.alphaMin() || tw)) sim.tick();
      if (canvas && w > 0 && h > 0 && v) render(canvas, ts);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function render(canvas: HTMLCanvasElement, ts: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.3);
    bg.addColorStop(0, "rgba(20,28,48,0.55)");
    bg.addColorStop(1, "rgba(5,6,10,1)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Lanes by kind — always shown (focus keeps the same kind structure).
    const focusStage = focalRef.current != null;
    const ls = lanesRef.current;
    const v = viewRef.current;
    const laneTop = PAD.top;
    const laneBot = lanesBottom();
    {
      const plotH = Math.max(1, laneBot - laneTop);
      const laneH = plotH / Math.max(1, ls.ordered.length);
      ctx.textBaseline = "middle";
      ctx.font = "11px ui-monospace, monospace";
      ls.ordered.forEach((kind, i) => {
        const yTop = laneTop + i * laneH;
        if (i % 2 === 1) {
          ctx.fillStyle = "rgba(255,255,255,0.018)";
          ctx.fillRect(PAD.left, yTop, w - PAD.left - PAD.right, laneH);
        }
        ctx.fillStyle = KIND_COLOR[kind] ?? "#94a3b8";
        ctx.globalAlpha = 0.85;
        ctx.textAlign = "right";
        ctx.fillText(kind, PAD.left - 12, yTop + laneH / 2);
        ctx.globalAlpha = 1;
      });
    }

    // Main view gridlines + date labels under the lanes (timeline only — focus
    // is freed from time).
    if (v && !focusStage) {
      const TICKS = 6;
      ctx.textAlign = "center";
      ctx.font = "10px ui-monospace, monospace";
      const now = Date.now();
      for (let i = 0; i < TICKS; i++) {
        const t = v.minT + (i / (TICKS - 1)) * (v.maxT - v.minT);
        const x = xForTime(t);
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, laneTop);
        ctx.lineTo(x, laneBot);
        ctx.stroke();
        ctx.fillStyle = "rgba(148,163,184,0.7)";
        const label =
          Math.abs(t - now) < (v.maxT - v.minT) / 12
            ? "now"
            : new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        ctx.fillText(label, x, laneBot + 11);
      }
    }

    const byId = simNodesRef.current;
    const subset = simRef.current?.nodes() ?? [];
    const subsetIds = new Set(subset.map((n) => n.id));
    const yOf = (n: SimNode) => n.y + Math.sin(ts / 1400 + n.phase) * 1.2;

    // Isolate: when a node is selected, show only it + its directly connected
    // neighbours (and just those edges). Pure render filter — no refetch, no
    // layout change, so it's instant and flicker-free.
    const sel = selectedRef.current;
    const foc = focalRef.current;
    let isoSet: Set<string> | null = null;
    if (sel) {
      isoSet = new Set<string>([sel]);
      for (const e of edgesRef.current) {
        if (e.source === sel) isoSet.add(e.target);
        else if (e.target === sel) isoSet.add(e.source);
      }
    }

    // edges — both endpoints in the visible window; when isolating, only edges
    // touching the selected node.
    for (const e of edgesRef.current) {
      if (!subsetIds.has(e.source) || !subsetIds.has(e.target)) continue;
      const s = byId.get(e.source);
      const tgt = byId.get(e.target);
      if (!s || !tgt) continue;
      // Edges touching the selection stay; others dim back (not hidden).
      const eDim = sel != null && e.source !== sel && e.target !== sel ? 0.12 : 1;
      const sy = yOf(s);
      const ty = yOf(tgt);
      const avg = (s.bright + tgt.bright) / 2;
      const mx = (s.x + tgt.x) / 2;
      const my = (sy + ty) / 2 - Math.min(60, Math.abs(tgt.x - s.x) * 0.18);
      ctx.beginPath();
      ctx.moveTo(s.x, sy);
      ctx.quadraticCurveTo(mx, my, tgt.x, ty);
      if (e.type === "supersede") {
        ctx.strokeStyle = `rgba(251,191,36,${0.45 * Math.max(0.3, avg) * eDim})`;
        ctx.lineWidth = 1.3;
      } else {
        ctx.strokeStyle = `rgba(125,211,252,${0.18 * Math.max(0.2, avg) * eDim})`;
        ctx.lineWidth = 0.7;
      }
      ctx.stroke();
    }

    // nodes — windowed subset plus nodes mid fade-out, so a detail refetch
    // eases in/out instead of popping. Selection dims non-connected nodes.
    const leaving = [...byId.values()].filter(
      (n) => !n.present && inWindow(n.t) && n.leavingAt != null && ts - n.leavingAt < FADE_MS,
    );
    for (const p of [...subset, ...leaving]) {
      const y = yOf(p);
      const isSel = p.id === sel;
      const isFocal = foc != null && p.id === foc;
      const dimmed = isoSet != null && !isoSet.has(p.id);
      // Enter/exit fade on refetch.
      const fade = p.present
        ? Math.min(1, (ts - p.appearAt) / FADE_MS)
        : Math.max(0, 1 - (ts - (p.leavingAt ?? ts)) / FADE_MS);
      if (fade <= 0) continue;
      // Solid core only — no glow. Opacity = importance; dimmed when a
      // selection isolates a different part of the graph.
      const base = dimmed ? p.bright * 0.12 : Math.min(1, Math.max(0.1, p.bright));
      ctx.fillStyle = hexToRgba(p.color, Math.max(0.05, base) * fade);
      ctx.beginPath();
      ctx.arc(p.x, y, p.r, 0, Math.PI * 2);
      ctx.fill();

      if ((isSel || isFocal) && p.present) {
        ctx.strokeStyle = isFocal ? "#ffffff" : "rgba(255,255,255,0.85)";
        ctx.lineWidth = isFocal ? 2 : 1.5;
        ctx.beginPath();
        ctx.arc(p.x, y, p.r + 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ── scrubber: full-timeline overview + zoom window (timeline stage only) ──
    const f = fullRef.current;
    if (f && v && !focusStage) {
      const bTop = brushTop();
      const rightEdge = w - PAD.right;
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(PAD.left, bTop, rightEdge - PAD.left, BRUSH_H);
      // mini-map: the full-timeline OVERVIEW compressed into the band by time +
      // lane, so the scrubber always shows the whole corpus even though the
      // main chart only loads the windowed detail.
      for (const m of miniRef.current) {
        const mx = xFull(m.t);
        const my = bTop + 5 + m.lf * (BRUSH_H - 10);
        ctx.fillStyle = hexToRgba(m.color, 0.22 + 0.45 * m.bright);
        ctx.fillRect(mx - 0.75, my - 0.75, 1.5, 1.5);
      }
      // zoom window over the full domain
      const selL = Math.max(PAD.left, xFull(v.minT));
      const selR = Math.min(rightEdge, xFull(v.maxT));
      ctx.fillStyle = "rgba(5,6,10,0.6)";
      if (selL > PAD.left) ctx.fillRect(PAD.left, bTop, selL - PAD.left, BRUSH_H);
      if (selR < rightEdge) ctx.fillRect(selR, bTop, rightEdge - selR, BRUSH_H);
      const winW = Math.max(2, selR - selL);
      ctx.fillStyle = "rgba(125,211,252,0.07)";
      ctx.fillRect(selL, bTop, winW, BRUSH_H);
      ctx.strokeStyle = "rgba(125,211,252,0.7)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(selL, bTop, winW, BRUSH_H);
      ctx.fillStyle = "rgba(125,211,252,0.95)";
      for (const hx of [selL, selR]) ctx.fillRect(hx - 1.5, bTop + BRUSH_H / 2 - 7, 3, 14);
      // full-domain date labels beneath the band
      const TICKS = 5;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillStyle = "rgba(148,163,184,0.55)";
      const now2 = Date.now();
      for (let i = 0; i < TICKS; i++) {
        const t = f.minT + (i / (TICKS - 1)) * (f.maxT - f.minT);
        const label =
          Math.abs(t - now2) < (f.maxT - f.minT) / 12
            ? "now"
            : new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        ctx.fillText(label, xFull(t), h - PAD.bottom + 13);
      }
    }
  }

  // ── hit testing (uses live sim positions) ────────────────────────
  function hit(clientX: number, clientY: number): SimNode | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    let best: SimNode | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const p of simRef.current?.nodes() ?? []) {
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d <= p.r + 6 && d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  // ── pointer: scrubber / pan / click ──────────────────────────────
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const brushRef = useRef<{ mode: "left" | "right" | "body"; lastX: number } | null>(null);

  function localXY(e: { clientX: number; clientY: number }) {
    const rect = canvasRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  }
  function brushRegion(x: number, y: number): "left" | "right" | "body" | "track" | null {
    const v = viewRef.current;
    if (!v || !fullRef.current) return null;
    const bTop = brushTop();
    if (y < bTop || y > bTop + BRUSH_H || x < PAD.left || x > sizeRef.current.w - PAD.right)
      return null;
    const selL = xFull(v.minT);
    const selR = xFull(v.maxT);
    if (Math.abs(x - selL) <= HANDLE_HIT) return "left";
    if (Math.abs(x - selR) <= HANDLE_HIT) return "right";
    return x > selL && x < selR ? "body" : "track";
  }
  function clampView(v: View): View {
    const f = fullRef.current;
    if (!f) return v;
    const span = v.maxT - v.minT;
    if (span >= f.maxT - f.minT) return { minT: f.minT, maxT: f.maxT };
    let { minT, maxT } = v;
    if (minT < f.minT) (minT = f.minT), (maxT = f.minT + span);
    if (maxT > f.maxT) (maxT = f.maxT), (minT = f.maxT - span);
    return { minT, maxT };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { x, y } = localXY(e);
    const region = brushRegion(x, y);
    if (region) {
      if (region === "track") {
        const v = viewRef.current;
        if (v) {
          const span = v.maxT - v.minT;
          const c = timeFullForX(x);
          viewRef.current = clampView({ minT: c - span / 2, maxT: c + span / 2 });
          applyWindow(0.35);
        }
        brushRef.current = { mode: "body", lastX: x };
      } else {
        brushRef.current = { mode: region, lastX: x };
      }
      tweenRef.current = null;
      return;
    }
    dragRef.current = { x: e.clientX, y: e.clientY, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const brush = brushRef.current;
    if (brush) {
      const { x } = localXY(e);
      const v = viewRef.current;
      const f = fullRef.current;
      if (v && f) {
        if (brush.mode === "left") {
          const minT = Math.max(f.minT, Math.min(timeFullForX(x), v.maxT - MIN_SPAN_MS));
          viewRef.current = { minT, maxT: v.maxT };
        } else if (brush.mode === "right") {
          const maxT = Math.min(f.maxT, Math.max(timeFullForX(x), v.minT + MIN_SPAN_MS));
          viewRef.current = { minT: v.minT, maxT };
        } else {
          const dt = timeFullForX(x) - timeFullForX(brush.lastX);
          viewRef.current = clampView({ minT: v.minT + dt, maxT: v.maxT + dt });
        }
        brush.lastX = x;
        applyWindow(0.3);
      }
      return;
    }
    const drag = dragRef.current;
    if (drag) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 3 || Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
      if (drag.moved) {
        const v = viewRef.current;
        if (v) {
          const dt = (v.maxT - v.minT) * (dx / plotW());
          viewRef.current = clampView({ minT: v.minT - dt, maxT: v.maxT - dt });
          drag.x = e.clientX;
          drag.y = e.clientY;
          tweenRef.current = null;
          applyWindow(0.3);
        }
      }
      return;
    }
    const canvas = canvasRef.current;
    const { x, y } = localXY(e);
    const region = brushRegion(x, y);
    if (region) {
      if (canvas)
        canvas.style.cursor =
          region === "left" || region === "right"
            ? "ew-resize"
            : region === "body"
              ? "grab"
              : "pointer";
      if (hover) setHover(null);
      return;
    }
    const p = hit(e.clientX, e.clientY);
    if (p) {
      if (canvas) canvas.style.cursor = "pointer";
      setHover({
        kind: p.node.kind ?? "memory",
        preview: p.node.content_preview.slice(0, 200),
        archived: p.node.archived,
        cx: e.clientX,
        cy: e.clientY,
      });
    } else {
      if (canvas) canvas.style.cursor = "grab";
      if (hover) setHover(null);
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    if (brushRef.current) {
      brushRef.current = null;
      return;
    }
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && !drag.moved) {
      const p = hit(e.clientX, e.clientY);
      // Click = focus: expand the node into its neighbourhood (ego cluster,
      // ignoring the timeline window). Background click exits focus.
      if (p) (onRefocus ?? onSelect)(p.id);
      else onSelect(null);
    }
  }
  function onWheel(e: React.WheelEvent) {
    const v = viewRef.current;
    if (!v) return;
    tweenRef.current = null;
    // Trackpad: horizontal two-finger scroll pans, vertical zooms. Pick the
    // dominant axis per event so a mostly-horizontal swipe never zooms.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const dt = (v.maxT - v.minT) * (e.deltaX / plotW());
      viewRef.current = clampView({ minT: v.minT + dt, maxT: v.maxT + dt });
    } else {
      const rect = canvasRef.current?.getBoundingClientRect();
      const px = rect ? e.clientX - rect.left : PAD.left + plotW() / 2;
      const center = timeForX(px);
      const factor = Math.exp(e.deltaY * 0.0012);
      let span = (v.maxT - v.minT) * factor;
      span = Math.max(MIN_SPAN_MS, Math.min(MAX_SPAN_MS, span));
      const leftFrac = (center - v.minT) / (v.maxT - v.minT);
      viewRef.current = clampView({
        minT: center - span * leftFrac,
        maxT: center + span * (1 - leftFrac),
      });
    }
    applyWindow(0.3);
  }
  function onDoubleClick(e: React.MouseEvent) {
    const p = hit(e.clientX, e.clientY);
    if (p && onRefocus) onRefocus(p.id);
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{
          width: size.w || "100%",
          height: size.h || "100%",
          display: "block",
          touchAction: "none",
          overscrollBehavior: "none", // horizontal pan must not trigger back-nav
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          dragRef.current = null;
          brushRef.current = null;
          setHover(null);
        }}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
      />
      {hover && (
        <div
          className="pointer-events-none fixed z-20 max-w-70 rounded-md border border-sky-400/40 bg-slate-900/95 px-2 py-1.5 font-mono text-[11px] text-slate-200 shadow-lg"
          style={{ left: Math.min(window.innerWidth - 290, hover.cx + 14), top: hover.cy + 14 }}
        >
          <strong className="text-sky-300">{hover.kind}</strong>
          {hover.archived && <span className="ml-1 text-slate-500">· archived</span>}
          <br />
          {hover.preview}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-1 right-3 z-10 font-mono text-[10px] text-slate-500">
        scrubber / 2-finger ↕ to zoom · drag or 2-finger ↔ to pan · click to focus · double-click to
        drill
      </div>
    </div>
  );
});
