// Tabbed shell for the inline-expanded memory row. Four tabs:
//
//   Content+Meta  → no fetch (data already in row)
//   Related       → fetches /memories/:id/related on first open
//   Chain         → fetches /memories/:id/supersede-chain on first open
//   Cluster+Capture → fetches /memories/:id/capture on first open
//
// Per-row fetches are cached in a ref-keyed map so re-clicking a tab
// doesn't refetch.

import { useEffect, useState } from "react";
import { ApiError, apiGet } from "../../lib/api.ts";
import { cn } from "../../lib/cn.ts";
import type { GraphEdge, GraphNode } from "../graph/types.ts";
import type { CaptureBody, ChainRow, MemoryRowData } from "./types.ts";

type Tab = "content" | "fields" | "related" | "chain" | "capture";

export function MemoryExpand({ data }: { data: MemoryRowData }) {
  const [tab, setTab] = useState<Tab>("content");

  return (
    <div className="border-t border-border bg-background/50">
      <div className="flex items-center gap-0.5 px-2 py-1.5 text-[10px] uppercase tracking-wide border-b border-border/60">
        <TabBtn active={tab === "content"} onClick={() => setTab("content")}>
          content
        </TabBtn>
        <TabBtn active={tab === "fields"} onClick={() => setTab("fields")}>
          fields
        </TabBtn>
        <TabBtn active={tab === "related"} onClick={() => setTab("related")}>
          related
        </TabBtn>
        <TabBtn active={tab === "chain"} onClick={() => setTab("chain")}>
          chain
        </TabBtn>
        <TabBtn active={tab === "capture"} onClick={() => setTab("capture")}>
          capture
        </TabBtn>
      </div>

      <div className="px-3 py-2.5">
        {tab === "content" && <ContentMetaTab data={data} />}
        {tab === "fields" && <FieldsTab id={data.id} />}
        {tab === "related" && <RelatedTab id={data.id} />}
        {tab === "chain" && <ChainTab id={data.id} />}
        {tab === "capture" && <CaptureTab data={data} />}
      </div>
    </div>
  );
}

// Every column of the memory row (fetched on demand). Shared by the Memories
// table and the Graph detail drawer.
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

function fmtField(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function FieldsTab({ id }: { id: string }) {
  const { data, error, loading } = useLazy(
    () => apiGet<{ memory: Record<string, unknown> }>(`/memories/${id}`),
    [id],
  );
  if (loading) return <Pending>Loading row…</Pending>;
  if (error) return <Failed message={error} />;
  if (!data) return null;
  const row = data.memory;
  const keys = [
    ...FIELD_ORDER.filter((k) => k in row),
    ...Object.keys(row).filter((k) => k !== "content" && k !== "meta" && !FIELD_ORDER.includes(k)),
  ];
  const meta = row.meta;
  return (
    <div className="space-y-3 text-[12px]">
      {typeof row.content === "string" && (
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            content
          </div>
          <pre className="whitespace-pre-wrap break-words font-sans text-foreground/90 leading-relaxed">
            {row.content}
          </pre>
        </div>
      )}
      <dl className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-1">
        {keys.map((k) => (
          <div key={k} className="contents">
            <dt className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">
              {k}
            </dt>
            <dd className="break-words font-mono text-[10px] text-foreground/90">
              {fmtField(row[k])}
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

function TabBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-sm border px-1.5 py-0.5 transition-colors",
        active
          ? "border-foreground/30 bg-foreground/10 text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ContentMetaTab({ data }: { data: MemoryRowData }) {
  return (
    <div className="space-y-3 text-sm">
      <pre className="whitespace-pre-wrap break-words text-foreground/90 font-sans leading-relaxed">
        {data.content}
      </pre>
      <dl className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 text-[11px] border-t border-border/40 pt-2">
        <Meta k="kind" v={data.kind ?? "—"} mono />
        <Meta k="repo" v={data.repo ?? "—"} mono />
        <Meta k="machine" v={data.machine_name ?? data.machine_id ?? "—"} mono />
        <Meta k="created" v={new Date(data.created_at).toLocaleString()} />
        <Meta k="importance" v={data.importance !== null ? data.importance.toFixed(3) : "—"} />
        {data.cluster_id && <Meta k="cluster" v={data.cluster_id.slice(0, 8)} mono />}
        {data.score !== null && <Meta k="score" v={data.score.toFixed(3)} />}
      </dl>
    </div>
  );
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground uppercase tracking-wider text-[9px] self-center">{k}</dt>
      <dd className={cn(mono && "font-mono")}>{v}</dd>
    </>
  );
}

function useLazy<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
): {
  data: T | null;
  error: string | null;
  loading: boolean;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg =
          e instanceof ApiError
            ? `${e.status} ${e.message}`
            : e instanceof Error
              ? e.message
              : String(e);
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, loading };
}

// Edge-type → label + dot colour, kept in sync with the graph focus edges
// (GraphCanvas): cluster=violet, related=blue, supersede=yellow.
const REL_META: Record<GraphEdge["type"], { label: string; dot: string }> = {
  cluster: { label: "cluster", dot: "#a78bfa" },
  related: { label: "related", dot: "#7dd3fc" },
  supersede: { label: "supersede", dot: "#fbbf24" },
};
const REL_ORDER: GraphEdge["type"][] = ["cluster", "related", "supersede"];

// The "Related" tab mirrors the graph focus: the node's real relationship
// neighbourhood (cluster siblings + theme, related_to links, supersede chain),
// grouped by edge type — not embedding nearest-neighbours.
function RelatedTab({ id }: { id: string }) {
  const { data, error, loading } = useLazy(
    () =>
      apiGet<{ nodes: GraphNode[]; edges: GraphEdge[]; cluster_id: string | null }>(
        `/memories/${id}/neighborhood`,
      ),
    [id],
  );
  if (loading) return <Pending>Loading connections…</Pending>;
  if (error) return <Failed message={error} />;
  if (!data) return null;

  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const groups: Record<GraphEdge["type"], GraphNode[]> = {
    cluster: [],
    related: [],
    supersede: [],
  };
  const seen: Record<GraphEdge["type"], Set<string>> = {
    cluster: new Set(),
    related: new Set(),
    supersede: new Set(),
  };
  // Collect the connected node on the far side of each edge (cluster edges run
  // member→theme, so sibling edges contribute both the sibling and the theme).
  for (const e of data.edges) {
    for (const end of [e.source, e.target]) {
      if (end === id || seen[e.type].has(end)) continue;
      const n = byId.get(end);
      if (!n) continue;
      seen[e.type].add(end);
      groups[e.type].push(n);
    }
  }
  const total = REL_ORDER.reduce((s, t) => s + groups[t].length, 0);
  if (total === 0) return <Empty>No graph connections (cluster, related, or supersede).</Empty>;

  return (
    <div className="space-y-3 text-[12px]">
      {REL_ORDER.filter((t) => groups[t].length).map((t) => (
        <div key={t}>
          <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: REL_META[t].dot }}
            />
            {REL_META[t].label} · {groups[t].length}
          </div>
          <ul className="space-y-1.5">
            {groups[t].map((n) => (
              <li key={n.id} className="rounded-md border border-border/60 bg-card/40 px-2 py-1.5">
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase tracking-wider">
                  {n.kind && <span>{n.kind}</span>}
                  {data.cluster_id === n.id && (
                    <span className="ml-auto text-violet-300">theme</span>
                  )}
                </div>
                <div className="mt-0.5 line-clamp-3 text-foreground/85 leading-snug">
                  {n.content_preview}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ChainTab({ id }: { id: string }) {
  const { data, error, loading } = useLazy(
    () => apiGet<{ parents: ChainRow[]; children: ChainRow[] }>(`/memories/${id}/supersede-chain`),
    [id],
  );
  if (loading) return <Pending>Walking supersede chain…</Pending>;
  if (error) return <Failed message={error} />;
  if (!data?.parents.length && !data?.children.length)
    return <Empty>This memory is not in any supersede chain.</Empty>;
  return (
    <div className="space-y-3 text-[12px]">
      {data.parents.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
            replaced (parents)
          </div>
          <ChainList rows={data.parents} />
        </div>
      )}
      {data.children.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
            replaced by (children)
          </div>
          <ChainList rows={data.children} />
        </div>
      )}
    </div>
  );
}

function ChainList({ rows }: { rows: ChainRow[] }) {
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.id} className="rounded-md border border-border/60 bg-card/40 px-2 py-1.5">
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase tracking-wider">
            {r.kind && <span>{r.kind}</span>}
            <span className="ml-auto">depth {r.depth}</span>
          </div>
          <div className="mt-0.5 line-clamp-3 text-foreground/85 leading-snug">
            {r.content_preview}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CaptureTab({ data }: { data: MemoryRowData }) {
  const {
    data: capture,
    error,
    loading,
  } = useLazy(() => apiGet<{ capture: CaptureBody }>(`/memories/${data.id}/capture`), [data.id]);
  return (
    <div className="space-y-3 text-[12px]">
      {data.cluster_id && (
        <div className="rounded-md border border-border/60 bg-card/40 p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
            cluster
          </div>
          <div className="font-mono text-[11px]">{data.cluster_id}</div>
        </div>
      )}
      <div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
          raw capture
        </div>
        {loading && <Pending>Loading capture body…</Pending>}
        {error && <Failed message={error} />}
        {capture && (
          <div className="rounded-md border border-border/60 bg-muted/20 p-2 max-h-64 overflow-y-auto">
            <div className="text-[9px] text-muted-foreground mb-1">
              {capture.capture.source} · {new Date(capture.capture.captured_at).toLocaleString()}
            </div>
            <pre className="whitespace-pre-wrap break-words text-[11px] font-mono text-foreground/85 leading-snug">
              {prettyJson(capture.capture.content)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Capture content is often a JSON tool observation; pretty-print it when it
// parses, else show it as-is (prompts/assistant text are plain).
function prettyJson(s: string): string {
  const t = s.trim();
  if (!(t.startsWith("{") || t.startsWith("["))) return s;
  try {
    return JSON.stringify(JSON.parse(t), null, 2);
  } catch {
    return s;
  }
}

function Pending({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground italic py-2">{children}</div>;
}

function Failed({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
      {message}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20 px-2 py-3 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}
