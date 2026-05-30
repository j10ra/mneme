// Right-side detail drawer for the Graph view. Slides in when a node
// is selected. Reuses MemoryExpand so the four sub-tabs (Content+Meta,
// Related, Chain, Cluster+Capture) work identically to the Memories
// table's inline expand.

import { Crosshair, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api.ts";
import { cn } from "../../lib/cn.ts";
import { MemoryExpand } from "../memories/MemoryExpand.tsx";
import type { MemoryRowData } from "../memories/types.ts";
import type { GraphNode } from "./types.ts";

// Order the full row reads in; everything else falls through after.
const FIELD_ORDER = [
  "kind",
  "importance",
  "recall_weight",
  "repo",
  "machine_name",
  "machine_id",
  "harness",
  "agent",
  "topics",
  "private",
  "created_at",
  "archived_at",
  "embedding_model",
  "content_hash",
  "capture_id",
  "chunk_id",
  "id",
];

function fmtValue(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// Full memory row (every column) — fetched on demand for the selected node.
function AllFields({ id }: { id: string }) {
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setRow(null);
    setErr(null);
    apiGet<{ memory: Record<string, unknown> }>(`/memories/${id}`)
      .then((r) => !cancelled && setRow(r.memory))
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (err) return <div className="px-3 py-2 text-[11px] text-destructive">{err}</div>;
  if (!row) return <div className="px-3 py-2 text-[11px] text-muted-foreground">loading…</div>;

  const keys = [
    ...FIELD_ORDER.filter((k) => k in row),
    ...Object.keys(row).filter((k) => k !== "content" && k !== "meta" && !FIELD_ORDER.includes(k)),
  ];
  const meta = row.meta;

  return (
    <div className="space-y-3 px-3 py-2 text-[11px]">
      {typeof row.content === "string" && (
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            content
          </div>
          <div className="whitespace-pre-wrap break-words text-foreground/90">{row.content}</div>
        </div>
      )}
      <dl className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-1">
        {keys.map((k) => (
          <div key={k} className="contents">
            <dt className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">
              {k}
            </dt>
            <dd className="break-words font-mono text-[10px] text-foreground/90">
              {fmtValue(row[k])}
            </dd>
          </div>
        ))}
      </dl>
      {meta != null && typeof meta === "object" && Object.keys(meta).length > 0 && (
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">meta</div>
          <pre className="overflow-x-auto rounded bg-muted/30 p-2 font-mono text-[10px] text-foreground/80">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function GraphDetailDrawer({
  node,
  onClose,
  onRefocus,
}: {
  node: GraphNode | null;
  onClose: () => void;
  onRefocus?: () => void;
}) {
  const [view, setView] = useState<"fields" | "links">("fields");
  return (
    <aside
      className={cn(
        "absolute right-0 top-0 bottom-0 w-[360px] border-l border-border bg-card transition-transform duration-200",
        node ? "translate-x-0" : "translate-x-full pointer-events-none",
      )}
    >
      {node && (
        <>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              {node.kind && (
                <span className="rounded-sm border border-border/60 bg-card px-1 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                  {node.kind}
                </span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground">
                {node.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onRefocus && (
                <button
                  type="button"
                  onClick={onRefocus}
                  title="refocus on this node"
                  className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 border-b border-border px-3 py-1.5">
            {(["fields", "links"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors",
                  view === v
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground/70 hover:text-foreground",
                )}
              >
                {v === "fields" ? "all fields" : "links"}
              </button>
            ))}
          </div>
          <div className="flex h-[calc(100%-69px)] flex-col overflow-y-auto">
            {view === "fields" ? (
              <AllFields id={node.id} />
            ) : (
              <MemoryExpand data={nodeToMemoryRow(node)} />
            )}
          </div>
        </>
      )}
    </aside>
  );
}

/** GraphNode is a thin slice of MemoryRowData — pad it back out so
 *  MemoryExpand can render. The fields it doesn't have stay as their
 *  empty/null defaults; the lazy-fetch tabs (related, chain, capture)
 *  fetch fresh data by id anyway. */
function nodeToMemoryRow(n: GraphNode): MemoryRowData {
  return {
    id: n.id,
    content: n.content_preview,
    kind: n.kind,
    repo: null,
    machine_id: n.machine_id,
    machine_name: n.machine_name,
    importance: n.importance,
    created_at: new Date().toISOString(),
    cluster_id: n.cluster_id,
    superseded: n.superseded,
    score: null,
  };
}
