// Flat timeline canvas of the memory corpus. X axis is time (oldest at
// the left, "now" at the right); Y is lanes by kind, reusing the legend
// colours. Node brightness encodes activity (recall_weight) so the most
// recalled memories light up while cold and archived ones fade — "the
// archive" sits dim at the left/low-activity end. Edges are static arcs
// (related faint, supersede amber); no animated particles.
//
// 2D <canvas> with hit-testing for hover/click — same props as the old
// 3D component, so GraphPanel is unchanged. The imperative handle is a
// no-op stub: GraphPanel's camera-zoom depth expansion guards on a
// missing cameraPosition() and simply doesn't fire here.

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { colorForNode, KIND_COLOR } from "./colors.ts";
import type { GraphEdge, GraphNode } from "./types.ts";

const PAD = { top: 18, right: 28, bottom: 34, left: 124 };

// Fixed lane order so the timeline doesn't reshuffle between fetches.
// Kinds not listed fall after these in first-seen order; null → "other".
const KIND_ORDER = Object.keys(KIND_COLOR);

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function radiusForImportance(imp: number | null): number {
  return 2.5 + Math.max(0, Math.min(1, imp ?? 0)) * 5.5;
}

type Placed = {
  node: GraphNode;
  x: number;
  y: number;
  r: number;
  color: string;
  bright: number;
};

export const GraphCanvas = forwardRef<
  unknown,
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
  // No camera/layout engine to expose; stub the handle so GraphPanel's
  // optional cameraPosition?.() call no-ops.
  useImperativeHandle(externalRef, () => ({}), []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);

  // ── Container resize observer ────────────────────────────────────
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

  // ── Lane assignment (kind → row index) ───────────────────────────
  const lanes = useMemo(() => {
    const present = new Set<string>();
    for (const n of nodes) present.add(n.kind ?? "other");
    const ordered: string[] = [];
    for (const k of KIND_ORDER) if (present.has(k)) ordered.push(k);
    for (const k of present) if (!ordered.includes(k)) ordered.push(k);
    const index = new Map<string, number>();
    ordered.forEach((k, i) => index.set(k, i));
    return { ordered, index };
  }, [nodes]);

  // ── Place every node on the timeline ─────────────────────────────
  const placed = useMemo(() => {
    const { w, h } = size;
    if (w === 0 || h === 0 || nodes.length === 0) return [] as Placed[];

    let minT = Number.POSITIVE_INFINITY;
    let maxT = Number.NEGATIVE_INFINITY;
    let maxRW = 0;
    for (const n of nodes) {
      const t = Date.parse(n.created_at);
      if (Number.isFinite(t)) {
        if (t < minT) minT = t;
        if (t > maxT) maxT = t;
      }
      const rw = n.recall_weight ?? 0;
      if (rw > maxRW) maxRW = rw;
    }
    if (!Number.isFinite(minT)) {
      minT = Date.now();
      maxT = Date.now();
    }
    const span = maxT - minT || 1;

    const plotW = w - PAD.left - PAD.right;
    const plotH = h - PAD.top - PAD.bottom;
    const laneH = plotH / Math.max(1, lanes.ordered.length);
    const q = query.trim().toLowerCase();

    return nodes.map<Placed>((n) => {
      const t = Date.parse(n.created_at);
      const ft = Number.isFinite(t) ? t : maxT;
      const x = PAD.left + ((ft - minT) / span) * plotW;
      const laneIdx = lanes.index.get(n.kind ?? "other") ?? 0;
      // Deterministic vertical jitter within the lane so same-time,
      // same-kind nodes don't stack on one pixel.
      const jitter = ((hashStr(n.id) % 1000) / 1000 - 0.5) * laneH * 0.7;
      const y = PAD.top + (laneIdx + 0.5) * laneH + jitter;

      const rwN = maxRW > 0 ? (n.recall_weight ?? 0) / maxRW : 0;
      let bright = n.archived ? 0.12 : 0.4 + 0.6 * rwN;
      if (q.length > 0 && !n.content_preview.toLowerCase().includes(q)) bright *= 0.15;

      return {
        node: n,
        x,
        y,
        r: radiusForImportance(n.importance),
        color: colorForNode(n),
        bright,
      };
    });
  }, [nodes, size, lanes, query]);

  // ── Render ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const { w, h } = size;
    if (!canvas || w === 0 || h === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background
    const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.3);
    bg.addColorStop(0, "rgba(20,28,48,0.55)");
    bg.addColorStop(1, "rgba(5,6,10,1)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const plotH = h - PAD.top - PAD.bottom;
    const laneH = plotH / Math.max(1, lanes.ordered.length);

    // Lane bands + labels
    ctx.textBaseline = "middle";
    ctx.font = "11px ui-monospace, monospace";
    lanes.ordered.forEach((kind, i) => {
      const yTop = PAD.top + i * laneH;
      const yc = yTop + laneH / 2;
      if (i % 2 === 1) {
        ctx.fillStyle = "rgba(255,255,255,0.018)";
        ctx.fillRect(PAD.left, yTop, w - PAD.left - PAD.right, laneH);
      }
      ctx.fillStyle = KIND_COLOR[kind] ?? "#94a3b8";
      ctx.globalAlpha = 0.85;
      ctx.textAlign = "right";
      ctx.fillText(kind, PAD.left - 12, yc);
      ctx.globalAlpha = 1;
    });

    // Time axis ticks
    const tNodes = placed;
    if (tNodes.length > 0) {
      let minT = Number.POSITIVE_INFINITY;
      let maxT = Number.NEGATIVE_INFINITY;
      for (const p of tNodes) {
        const t = Date.parse(p.node.created_at);
        if (Number.isFinite(t)) {
          if (t < minT) minT = t;
          if (t > maxT) maxT = t;
        }
      }
      const span = maxT - minT || 1;
      const plotW = w - PAD.left - PAD.right;
      const TICKS = 5;
      ctx.textAlign = "center";
      ctx.font = "10px ui-monospace, monospace";
      for (let i = 0; i < TICKS; i++) {
        const t = minT + (i / (TICKS - 1)) * span;
        const x = PAD.left + ((t - minT) / span) * plotW;
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, PAD.top);
        ctx.lineTo(x, h - PAD.bottom);
        ctx.stroke();
        ctx.fillStyle = "rgba(148,163,184,0.7)";
        const label = new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        ctx.fillText(i === TICKS - 1 ? "now" : label, x, h - PAD.bottom + 14);
      }
    }

    // Index for edge endpoints
    const byId = new Map<string, Placed>();
    for (const p of placed) byId.set(p.node.id, p);

    // Edges (under nodes), static arcs
    for (const e of edges) {
      const s = byId.get(e.source);
      const tgt = byId.get(e.target);
      if (!s || !tgt) continue;
      const avg = (s.bright + tgt.bright) / 2;
      const mx = (s.x + tgt.x) / 2;
      const my = (s.y + tgt.y) / 2 - Math.min(60, Math.abs(tgt.x - s.x) * 0.18);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.quadraticCurveTo(mx, my, tgt.x, tgt.y);
      if (e.type === "supersede") {
        ctx.strokeStyle = `rgba(251,191,36,${0.45 * Math.max(0.3, avg)})`;
        ctx.lineWidth = 1.3;
      } else {
        ctx.strokeStyle = `rgba(125,211,252,${0.18 * Math.max(0.2, avg)})`;
        ctx.lineWidth = 0.7;
      }
      ctx.stroke();
    }

    // Nodes — glow then core
    for (const p of placed) {
      const isSel = p.node.id === selectedId;
      const isFocal = focalId != null && p.node.id === focalId;
      const glowR = p.r * (isFocal ? 5 : isSel ? 4 : 3) * (0.5 + p.bright);
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      g.addColorStop(0, hexToRgba(p.color, 0.55 * p.bright));
      g.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      ctx.fillStyle = hexToRgba(p.color, Math.min(1, 0.45 + 0.55 * p.bright));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      if (isSel || isFocal) {
        ctx.strokeStyle = isFocal ? "#ffffff" : "rgba(255,255,255,0.8)";
        ctx.lineWidth = isFocal ? 2 : 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [placed, size, lanes, selectedId, focalId, hover]);

  // ── Hit testing ──────────────────────────────────────────────────
  function hit(clientX: number, clientY: number): Placed | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    let best: Placed | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const p of placed) {
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d <= p.r + 5 && d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ width: size.w || "100%", height: size.h || "100%", display: "block" }}
        onMouseMove={(e) => {
          const p = hit(e.clientX, e.clientY);
          if (p) {
            if (hover?.id !== p.node.id) setHover({ id: p.node.id, x: p.x, y: p.y });
            e.currentTarget.style.cursor = "pointer";
          } else {
            if (hover) setHover(null);
            e.currentTarget.style.cursor = "default";
          }
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const p = hit(e.clientX, e.clientY);
          if (p) (onRefocus ? onRefocus : onSelect)(p.node.id);
          else onSelect(null);
        }}
      />
      {hover &&
        (() => {
          const p = placed.find((x) => x.node.id === hover.id);
          if (!p) return null;
          const left = Math.min(size.w - 290, Math.max(8, p.x + 12));
          const top = Math.max(8, p.y - 8);
          return (
            <div
              className="pointer-events-none absolute z-20 max-w-[280px] rounded-md border border-sky-400/40 bg-slate-900/95 px-2 py-1.5 font-mono text-[11px] text-slate-200 shadow-lg"
              style={{ left, top }}
            >
              <strong className="text-sky-300">{p.node.kind ?? "memory"}</strong>
              {p.node.archived && <span className="ml-1 text-slate-500">· archived</span>}
              <br />
              {p.node.content_preview.slice(0, 200)}
            </div>
          );
        })()}
    </div>
  );
});

// "#rrggbb" → "rgba(r,g,b,a)". Falls back to the input for non-hex.
function hexToRgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const int = Number.parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${a})`;
}
