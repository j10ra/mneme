// Status panel — workers, breakers, last dream cycle. Polls
// /dashboard/api/status every 30s. shadcn primitives + Base UI.

import { CircleAlert, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, apiGet, apiPost } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
import { Badge } from "./ui/badge.tsx";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card.tsx";
import { Skeleton } from "./ui/skeleton.tsx";
import { Button } from "./ui/button.tsx";

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

type BreakerState = {
  open: boolean;
  failures: number;
  reopensInMs: number;
};

type StatusResponse = {
  generated_at: string;
  workers: WorkerRow[];
  daemons: unknown[];
  dream: {
    last_window_at: string | null;
    last_cluster_count: number | null;
    in_flight: number;
    stuck: number;
    stuck_after_ms: number;
  };
  breakers: Record<string, BreakerState>;
};

type DaemonSchedule = {
  dream?: {
    schedule_ms: number;
    next_run_at: string;
    last_run_at: string | null;
    last_duration_ms: number | null;
  };
};

type FetchState =
  | { kind: "loading" }
  | {
      kind: "ok";
      data: StatusResponse;
      schedule: DaemonSchedule | null;
      fetchedAt: number;
    }
  | {
      kind: "stale";
      data: StatusResponse;
      schedule: DaemonSchedule | null;
      fetchedAt: number;
      error: string;
    }
  | { kind: "error"; error: string };

const POLL_MS = 30_000;

function fmtAge(ms: number | null): string {
  if (ms === null) return "never";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;

  return `${Math.round(ms / 86_400_000)}d`;
}

// Like fmtAge but keeps sub-second precision so a 17,373ms duration
// reads as "17.4s" rather than "17s" or the raw ms.
function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
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
      // Skip the network round-trip when the tab is hidden. The
      // visibilitychange listener below restarts the loop on resume.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      try {
        const [data, schedule] = await Promise.all([
          apiGet<StatusResponse>("/status"),
          apiGet<DaemonSchedule>("/daemon-schedule").catch(() => null as DaemonSchedule | null),
        ]);

        if (cancelled) return;
        setState({ kind: "ok", data, schedule, fetchedAt: Date.now() });
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
            ? {
                kind: "stale",
                data: prev.data,
                schedule: prev.schedule,
                fetchedAt: prev.fetchedAt,
                error: msg,
              }
            : { kind: "error", error: msg },
        );
      } finally {
        if (!cancelled && document.visibilityState !== "hidden") {
          timer = setTimeout(tick, POLL_MS);
        }
      }
    };

    const onVisibility = () => {
      if (!cancelled && document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void tick();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <CardTitle>Status</CardTitle>
          {state.kind === "ok" || state.kind === "stale" ? (
            <BreakerSummary breakers={state.data.breakers} />
          ) : null}
        </div>
        <CardDescription>workers · breakers · last dream cycle</CardDescription>
      </CardHeader>
      <div className="px-5 pb-5 space-y-4">
        {state.kind === "loading" && <SkeletonRows />}
        {state.kind === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Failed to load status</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {(state.kind === "ok" || state.kind === "stale") && (
          <>
            {state.kind === "stale" && (
              <Alert variant="warning">
                <AlertTitle>Stale data</AlertTitle>
                <AlertDescription>
                  last updated {fmtAge(Date.now() - state.fetchedAt)} ago — last error:{" "}
                  {state.error}
                </AlertDescription>
              </Alert>
            )}
            <StatusContent data={state.data} schedule={state.schedule} />
          </>
        )}
      </div>
    </Card>
  );
}

function BreakerSummary({ breakers }: { breakers: Record<string, BreakerState> }) {
  const open = Object.entries(breakers).filter(([, b]) => b.open);

  if (open.length === 0) {
    return (
      <Badge variant="success">
        <Activity className="h-3 w-3" />
        all closed
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <CircleAlert className="h-3 w-3" />
      {open.length} open
    </Badge>
  );
}

function StatusContent({
  data,
  schedule,
}: {
  data: StatusResponse;
  schedule: DaemonSchedule | null;
}) {
  const napRow = data.workers.find((w) => w.name === "nap");
  const digestRow = data.workers.find((w) => w.name === "digest");
  const otherWorkers = data.workers.filter((w) => w.name !== "nap" && w.name !== "digest");

  return (
    <>
      <SectionHeading>Brain</SectionHeading>
      <div className="grid gap-2">
        {napRow && <WorkerRowItem w={napRow} />}
        <DreamRowItem data={data.dream} schedule={schedule} />
        {digestRow && <WorkerRowItem w={digestRow} />}
      </div>

      {otherWorkers.length > 0 && (
        <>
          <SectionHeading>Workers</SectionHeading>
          <div className="grid gap-2">
            {otherWorkers.map((w) => (
              <WorkerRowItem key={w.name} w={w} />
            ))}
          </div>
        </>
      )}

      <SectionHeading>Breakers</SectionHeading>
      <div className="flex flex-wrap gap-2">
        {Object.entries(data.breakers).map(([name, b]) => (
          <Badge key={name} variant={b.open ? "destructive" : "default"}>
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                b.open ? "bg-destructive" : "bg-success",
              )}
            />
            {name}
            {b.open && <span className="opacity-80">· reopens {fmtAge(b.reopensInMs)}</span>}
            {!b.open && b.failures > 0 && <span className="opacity-60">· {b.failures} fail</span>}
          </Badge>
        ))}
      </div>
    </>
  );
}

function WorkerRowItem({ w }: { w: WorkerRow }) {
  const status = w.last_status ?? "ok";
  const forceable = w.name === "nap" || w.name === "digest";

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-border bg-card px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "inline-block h-2 w-2 shrink-0 rounded-full",
            status === "ok" ? "bg-success" : "bg-destructive",
          )}
        />
        <span className="font-medium truncate">{w.name}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          last {fmtAge(w.since_last_run_ms)} ago
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
        {w.last_duration_ms !== null && <span>{fmtDuration(w.last_duration_ms)}</span>}
        <span className="whitespace-nowrap">
          next in {fmtAge(Math.max(0, new Date(w.next_run_at).getTime() - Date.now()))}
        </span>
        {forceable && (
          <ForceButton
            worker={w.name}
            lastRunAt={w.last_run_at}
            serverPending={w.last_status === null}
          />
        )}
      </div>
    </div>
  );
}

// Dream row in the Brain section. Same shell as WorkerRowItem (dot,
// name, last-run age on the left; metadata + run button on the right)
// but the metadata shows clusters/in-flight/stuck rather than duration.
function DreamRowItem({
  data,
  schedule,
}: {
  data: StatusResponse["dream"];
  schedule: DaemonSchedule | null;
}) {
  const lastAge = data.last_window_at
    ? fmtAge(Date.now() - new Date(data.last_window_at).getTime())
    : null;
  const nextInMs = schedule?.dream
    ? Math.max(0, new Date(schedule.dream.next_run_at).getTime() - Date.now())
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-border bg-card px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-success" />
        <span className="font-medium truncate">dream</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          last {lastAge ? `${lastAge} ago` : "never"}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
        <span>clusters: {data.last_cluster_count ?? "—"}</span>
        <span>in-flight: {data.in_flight}</span>
        {nextInMs !== null && <span className="whitespace-nowrap">next in {fmtAge(nextInMs)}</span>}
        {data.stuck > 0 && (
          <Badge variant="warning">
            <CircleAlert className="h-3 w-3" />
            {data.stuck} stuck &gt; 30m
          </Badge>
        )}
        <ForceButton
          worker="dream"
          lastRunAt={data.last_window_at}
          serverPending={data.in_flight > 0}
        />
      </div>
    </div>
  );
}

// Force-run button. Disabled while the worker is pending. "Pending"
// has two sources: the panel's polled server data (last_status === null
// for nap/digest, in_flight > 0 for dream), which survives a browser
// refresh; and a local clickedAt > lastRunAt fallback that covers the
// brief gap between the POST returning and the next 30s poll. Either
// signal keeps the button disabled.
function ForceButton({
  worker,
  lastRunAt,
  serverPending,
}: {
  worker: string;
  lastRunAt: string | null;
  serverPending: boolean;
}) {
  const [clickedAt, setClickedAt] = useState<number | null>(null);
  const [errored, setErrored] = useState(false);
  const lastRunMs = lastRunAt ? new Date(lastRunAt).getTime() : 0;
  const localPending = clickedAt !== null && lastRunMs < clickedAt;
  const pending = serverPending || localPending;

  const onClick = async () => {
    setErrored(false);
    setClickedAt(Date.now());

    try {
      await apiPost(`/worker/${worker}/run`);
    } catch (err) {
      console.error(`[ForceButton] ${worker} run failed`, err);
      setErrored(true);
      setClickedAt(null);
    }
  };

  const label = errored ? "failed" : pending ? "running" : "run now";

  return (
    <Button
      size="xs"
      variant={errored ? "secondary" : "ghost"}
      disabled={pending}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-9" />
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
