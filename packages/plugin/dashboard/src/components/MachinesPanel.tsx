// Machines panel — registered machines split into Live (heartbeat fresh)
// and Known (everyone else, including revoked + never-heartbeated). Live
// rows surface first. Polls /dashboard/api/machines every 30s.
//
// State contract: loading skeleton, empty, error with retry, stale
// (cached + warn banner) all handled — same shape as StatusPanel.

import { useEffect, useState } from "react";
import { ApiError, apiGet } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";

type MachineRow = {
  id: string;
  name: string;
  machine_id: string | null;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  heartbeat_pending: number | null;
  heartbeat_extracted: number | null;
  heartbeat_embedded: number | null;
  heartbeat_failed: number | null;
  heartbeat_last_processed_at: string | null;
  heartbeat_posted_at: string | null;
};

type MachinesResponse = { machines: MachineRow[] };

type FetchState =
  | { kind: "loading" }
  | { kind: "ok"; data: MachinesResponse; fetchedAt: number }
  | { kind: "stale"; data: MachinesResponse; fetchedAt: number; error: string }
  | { kind: "error"; error: string };

const POLL_MS = 30_000;
const LIVE_THRESHOLD_MS = 3 * 60_000; // <3min since heartbeat = live

function fmtAge(ms: number | null): string {
  if (ms === null) return "never";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function ageMs(iso: string | null): number | null {
  if (!iso) return null;
  return Date.now() - new Date(iso).getTime();
}

function isLive(m: MachineRow): boolean {
  if (m.revoked_at) return false;
  const age = ageMs(m.heartbeat_posted_at);
  return age !== null && age < LIVE_THRESHOLD_MS;
}

export function MachinesPanel() {
  const [state, setState] = useState<FetchState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const data = await apiGet<MachinesResponse>("/machines");
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
    <div className="rounded-lg border border-border bg-card text-card-foreground p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Machines</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            registered · live = heartbeat &lt; 3m
          </p>
        </div>
        {(state.kind === "ok" || state.kind === "stale") && (
          <CountBadges data={state.data} />
        )}
      </div>

      {state.kind === "loading" && <SkeletonRows />}
      {state.kind === "error" && <ErrorBox message={state.error} />}
      {(state.kind === "ok" || state.kind === "stale") && (
        <>
          {state.kind === "stale" && (
            <StaleBanner fetchedAt={state.fetchedAt} error={state.error} />
          )}
          <MachinesContent data={state.data} />
        </>
      )}
    </div>
  );
}

function CountBadges({ data }: { data: MachinesResponse }) {
  const live = data.machines.filter(isLive).length;
  const total = data.machines.filter((m) => !m.revoked_at).length;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
        {live} live
      </span>
      <span className="text-muted-foreground">{total} active</span>
    </div>
  );
}

function MachinesContent({ data }: { data: MachinesResponse }) {
  if (data.machines.length === 0) {
    return <Empty>No machines registered yet.</Empty>;
  }

  // Live first (sorted by freshest heartbeat), then known (active non-live by
  // last_used desc), then revoked at the bottom.
  const live: MachineRow[] = [];
  const known: MachineRow[] = [];
  const revoked: MachineRow[] = [];
  for (const m of data.machines) {
    if (m.revoked_at) revoked.push(m);
    else if (isLive(m)) live.push(m);
    else known.push(m);
  }
  live.sort((a, b) => (ageMs(a.heartbeat_posted_at) ?? Infinity) - (ageMs(b.heartbeat_posted_at) ?? Infinity));
  known.sort((a, b) => (ageMs(a.last_used_at) ?? Infinity) - (ageMs(b.last_used_at) ?? Infinity));
  revoked.sort((a, b) => (ageMs(a.revoked_at) ?? Infinity) - (ageMs(b.revoked_at) ?? Infinity));

  return (
    <div className="space-y-4">
      {live.length > 0 && (
        <Section title="Live" hint={`${live.length} online now`}>
          {live.map((m) => (
            <Row key={m.id} m={m} live />
          ))}
        </Section>
      )}
      {known.length > 0 && (
        <Section title="Known" hint="registered but not currently heartbeating">
          {known.map((m) => (
            <Row key={m.id} m={m} live={false} />
          ))}
        </Section>
      )}
      {revoked.length > 0 && (
        <Section title="Revoked" hint="tokens disabled">
          {revoked.map((m) => (
            <Row key={m.id} m={m} live={false} revoked />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
        {title}
        {hint && <span className="font-normal normal-case">· {hint}</span>}
      </h3>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function Row({
  m,
  live,
  revoked,
}: {
  m: MachineRow;
  live: boolean;
  revoked?: boolean;
}) {
  const heartbeatAge = ageMs(m.heartbeat_posted_at);
  const lastUsedAge = ageMs(m.last_used_at);
  const pending = m.heartbeat_pending ?? 0;
  const failed = m.heartbeat_failed ?? 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
        revoked
          ? "border-border/50 bg-muted/20 opacity-70"
          : "border-border bg-card",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "inline-block h-2 w-2 shrink-0 rounded-full",
            revoked
              ? "bg-muted-foreground/50"
              : live
                ? "bg-success"
                : "bg-warning",
          )}
          aria-label={revoked ? "revoked" : live ? "live" : "stale"}
        />
        <span className="font-medium truncate">{m.name}</span>
        {m.machine_id && (
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            {m.machine_id.slice(0, 8)}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        {!revoked && heartbeatAge !== null && (
          <span title="last heartbeat">♥ {fmtAge(heartbeatAge)}</span>
        )}
        {!revoked && heartbeatAge === null && (
          <span className="opacity-60">no heartbeat</span>
        )}
        {!revoked && pending > 0 && (
          <span className={cn(pending > 100 && "text-warning")}>
            {pending} pending
          </span>
        )}
        {!revoked && failed > 0 && (
          <span className="text-destructive">{failed} failed</span>
        )}
        {revoked ? (
          <span>revoked {fmtAge(ageMs(m.revoked_at))} ago</span>
        ) : (
          <span title="last token use">used {fmtAge(lastUsedAge)} ago</span>
        )}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
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
      <strong className="font-medium">Failed to load machines</strong>
      <p className="mt-1 text-xs opacity-80">{message}</p>
    </div>
  );
}

function StaleBanner({
  fetchedAt,
  error,
}: {
  fetchedAt: number;
  error: string;
}) {
  return (
    <div className="mb-3 rounded-md border border-warning/50 bg-warning/10 text-warning px-3 py-2 text-xs">
      <strong className="font-medium">Stale data</strong>{" "}
      <span className="opacity-80">
        last updated {fmtAge(Date.now() - fetchedAt)} ago — last error: {error}
      </span>
    </div>
  );
}
