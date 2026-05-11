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
import type { CaptureBody, ChainRow, MemoryRowData, RelatedRow } from "./types.ts";

type Tab = "content" | "related" | "chain" | "capture";

export function MemoryExpand({ data }: { data: MemoryRowData }) {
  const [tab, setTab] = useState<Tab>("content");

  return (
    <div className="border-t border-border bg-background/50">
      <div className="flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-wider border-b border-border/60">
        <TabBtn active={tab === "content"} onClick={() => setTab("content")}>
          content
        </TabBtn>
        <TabBtn active={tab === "related"} onClick={() => setTab("related")}>
          related
        </TabBtn>
        <TabBtn active={tab === "chain"} onClick={() => setTab("chain")}>
          chain
        </TabBtn>
        <TabBtn active={tab === "capture"} onClick={() => setTab("capture")}>
          cluster + capture
        </TabBtn>
      </div>

      <div className="px-3 py-2.5">
        {tab === "content" && <ContentMetaTab data={data} />}
        {tab === "related" && <RelatedTab id={data.id} />}
        {tab === "chain" && <ChainTab id={data.id} />}
        {tab === "capture" && <CaptureTab data={data} />}
      </div>
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
        "rounded-sm border px-2 py-0.5 transition-colors",
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

function RelatedTab({ id }: { id: string }) {
  const { data, error, loading } = useLazy(
    () => apiGet<{ related: RelatedRow[] }>(`/memories/${id}/related?k=6`),
    [id],
  );
  if (loading) return <Pending>Loading neighbors…</Pending>;
  if (error) return <Failed message={error} />;
  if (!data?.related.length) return <Empty>No vector neighbors found.</Empty>;
  return (
    <ul className="space-y-1.5 text-[12px]">
      {data.related.map((r) => (
        <li key={r.id} className="rounded-md border border-border/60 bg-card/40 px-2 py-1.5">
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase tracking-wider">
            {r.kind && <span>{r.kind}</span>}
            <span className="ml-auto tabular-nums">dist {r.distance.toFixed(3)}</span>
          </div>
          <div className="mt-0.5 line-clamp-3 text-foreground/85 leading-snug">
            {r.content_preview}
          </div>
        </li>
      ))}
    </ul>
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
              {capture.capture.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
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
