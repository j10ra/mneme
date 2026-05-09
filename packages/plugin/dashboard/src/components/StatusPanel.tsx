// Status panel — one snapshot of the pipeline's operational health:
// scheduler workers, breaker state, last dream cycle. Polls
// /dashboard/api/status every 30s. Re-uses the JSON shape of the
// server's /api/_ops/status (proxied via the daemon).
//
// State contract per the dashboard plan: loading skeleton, empty, error
// with retry, stale (cached + warn) all handled.

import { useEffect, useState } from "react";
import { ApiError, apiGet } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";

type WorkerRow = {
  name: string;
  schedule_ms: number;
  last_run_at: string | null;
  last_status: "ok" | "failed" | null;
  last_error: string | null;
  last_duration_ms: number | null;
  next_run_at: string;
  overdue_ms: number;
  since_last_run_ms: number | null;
};

type DaemonRow = {
  machine_id: string;
  machine_name: string | null;
  outbox_pending: number;
  outbox_extracted: number;
  outbox_embedded: number;
  outbox_failed: number;
  last_processed_at: string | null;
  posted_at: string;
  stale: boolean;
  since_posted_ms: number;
};

type BreakerState = {
  open: boolean;
  failures: number;
  reopensInMs: number;
};

type StatusResponse = {
  generated_at: string;
  workers: WorkerRow[];
  daemons: DaemonRow[];
  dream: {
    last_window_at: string | null;
    last_cluster_count: number | null;
    in_flight: number;
    stuck: number;
    stuck_after_ms: number;
  };
  breakers: Record<string, BreakerState>;
};

type FetchState =
  | { kind: "loading" }
  | { kind: "ok"; data: StatusResponse; fetchedAt: number }
  | { kind: "stale"; data: StatusResponse; fetchedAt: number; error: string }
  | { kind: "error"; error: string };

const POLL_MS = 30_000;

function fmtAge(ms: number | null): string {
  if (ms === null) return "never";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

export function StatusPanel() {
  const [state, setState] = useState<FetchState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const data = await apiGet<StatusResponse>("/status");
        if (cancelled) return;
        setState({ kind: "ok", data, fetchedAt: Date.now() });
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? `${err.status} ${err.message}`
            : err instanceof Error
              ? err.message
              : String(err);
        setState((prev) =>
          prev.kind === "ok" || prev.kind === "stale"
            ? { kind: "stale", data: prev.data, fetchedAt: prev.fetchedAt, error: msg }
            : { kind: "error", error: msg },
        );
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_MS);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <Card>
      <CardHeader title="Status" subtitle="workers · breakers · last dream cycle" />
      {state.kind === "loading" && <SkeletonRows />}
      {state.kind === "error" && <ErrorBox message={state.error} />}
      {(state.kind === "ok" || state.kind === "stale") && (
        <>
          {state.kind === "stale" && <StaleBanner fetchedAt={state.fetchedAt} error={state.error} />}
          <StatusContent data={state.data} />
        </>
      )}
    </Card>
  );
}

function StatusContent({ data }: { data: StatusResponse }) {
  return (
    <div className="space-y-4">
      {/* Workers */}
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Workers
        </h3>
        {data.workers.length === 0 ? (
          <Empty>No workers registered.</Empty>
        ) : (
          <div className="grid gap-2">
            {data.workers.map((w) => (
              <div
                key={w.name}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <StatusDot status={w.last_status ?? "ok"} />
                  <span className="font-medium">{w.name}</span>
                  <span className="text-xs text-muted-foreground">
                    last {fmtAge(w.since_last_run_ms)} ago
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {w.last_duration_ms !== null && <span>{w.last_duration_ms}ms</span>}
                  <span>
                    next in {fmtAge(Math.max(0, new Date(w.next_run_at).getTime() - Date.now()))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dream */}
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Dream
        </h3>
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <span className="text-muted-foreground">last window:</span>{" "}
              {data.dream.last_window_at
                ? `${fmtAge(Date.now() - new Date(data.dream.last_window_at).getTime())} ago`
                : "never"}
            </span>
            <span>
              <span className="text-muted-foreground">clusters:</span>{" "}
              {data.dream.last_cluster_count ?? "—"}
            </span>
            <span>
              <span className="text-muted-foreground">in-flight:</span> {data.dream.in_flight}
            </span>
            {data.dream.stuck > 0 && (
              <span className="text-warning">⚠ {data.dream.stuck} stuck &gt; 30m</span>
            )}
          </div>
        </div>
      </section>

      {/* Breakers */}
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Breakers
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.breakers).map(([name, b]) => (
            <span
              key={name}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                b.open
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-border bg-card text-foreground",
              )}
            >
              <StatusDot status={b.open ? "failed" : "ok"} />
              {name}
              {b.open && <span>· reopens {fmtAge(b.reopensInMs)}</span>}
              {!b.open && b.failures > 0 && (
                <span className="text-muted-foreground">· {b.failures} failures</span>
              )}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Local primitives (tiny, will be replaced by shadcn copies later) ─

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground p-5">
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function StatusDot({ status }: { status: "ok" | "failed" }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        status === "ok" ? "bg-success" : "bg-destructive",
      )}
      aria-label={status}
    />
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive px-3 py-2 text-sm">
      <strong className="font-medium">Failed to load status</strong>
      <p className="mt-1 text-xs opacity-80">{message}</p>
    </div>
  );
}

function StaleBanner({ fetchedAt, error }: { fetchedAt: number; error: string }) {
  return (
    <div className="mb-3 rounded-md border border-warning/50 bg-warning/10 text-warning-foreground px-3 py-2 text-xs">
      <strong className="font-medium">Stale data</strong>{" "}
      <span className="opacity-80">
        last updated {fmtAge(Date.now() - fetchedAt)} ago — last error: {error}
      </span>
    </div>
  );
}
