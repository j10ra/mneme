// Machines panel — registered machines split into Live (heartbeat fresh)
// and Known (everyone else); revoked rows summarised by name.

import { Laptop } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, apiGet } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
import { Badge } from "./ui/badge.tsx";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card.tsx";
import { Skeleton } from "./ui/skeleton.tsx";

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

const POLL_MS = 60_000;
const LIVE_THRESHOLD_MS = 3 * 60_000;

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
      // Skip the network round-trip when the tab is hidden. The
      // visibilitychange listener below restarts the loop on resume.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

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
          <CardTitle>Machines</CardTitle>
          {state.kind === "ok" || state.kind === "stale" ? <CountBadges data={state.data} /> : null}
        </div>
        <CardDescription>registered · live = heartbeat &lt; 3m</CardDescription>
      </CardHeader>

      <div className="px-5 pb-5 space-y-4">
        {state.kind === "loading" && <SkeletonRows />}
        {state.kind === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Failed to load machines</AlertTitle>
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
            <MachinesContent data={state.data} />
          </>
        )}
      </div>
    </Card>
  );
}

function CountBadges({ data }: { data: MachinesResponse }) {
  const live = data.machines.filter(isLive).length;
  const total = data.machines.filter((m) => !m.revoked_at).length;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={live > 0 ? "success" : "secondary"}>
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            live > 0 ? "bg-success" : "bg-muted-foreground/40",
          )}
        />
        {live} live
      </Badge>
      <span className="text-xs text-muted-foreground">{total} active</span>
    </div>
  );
}

function MachinesContent({ data }: { data: MachinesResponse }) {
  if (data.machines.length === 0) {
    return <Empty>No machines registered yet.</Empty>;
  }

  const live: MachineRow[] = [];
  const known: MachineRow[] = [];
  const revoked: MachineRow[] = [];

  for (const m of data.machines) {
    if (m.revoked_at) revoked.push(m);
    else if (isLive(m)) live.push(m);
    else known.push(m);
  }

  live.sort(
    (a, b) =>
      (ageMs(a.heartbeat_posted_at) ?? Infinity) - (ageMs(b.heartbeat_posted_at) ?? Infinity),
  );
  known.sort((a, b) => (ageMs(a.last_used_at) ?? Infinity) - (ageMs(b.last_used_at) ?? Infinity));

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
      {revoked.length > 0 && <RevokedSummary rows={revoked} />}
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

function Row({ m, live }: { m: MachineRow; live: boolean }) {
  const heartbeatAge = ageMs(m.heartbeat_posted_at);
  const lastUsedAge = ageMs(m.last_used_at);
  const pending = m.heartbeat_pending ?? 0;
  const failed = m.heartbeat_failed ?? 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-border bg-card px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Laptop className={cn("h-3.5 w-3.5 shrink-0", live ? "text-success" : "text-warning")} />
        <span className="font-medium truncate">{m.name}</span>
        {m.machine_id && (
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            {m.machine_id.slice(0, 8)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
        {heartbeatAge !== null ? (
          <span title="last heartbeat" className="whitespace-nowrap">
            ♥ {fmtAge(heartbeatAge)}
          </span>
        ) : (
          <span className="opacity-60">no heartbeat</span>
        )}
        {pending > 0 && (
          <Badge variant={pending > 100 ? "warning" : "secondary"}>{pending} pending</Badge>
        )}
        {failed > 0 && <Badge variant="destructive">{failed} failed</Badge>}
        <span title="last token use" className="whitespace-nowrap">
          used {fmtAge(lastUsedAge)} ago
        </span>
      </div>
    </div>
  );
}

function RevokedSummary({ rows }: { rows: MachineRow[] }) {
  type Group = {
    name: string;
    tokenCount: number;
    machineIds: Set<string>;
    mostRecent: number;
  };
  const groups = new Map<string, Group>();

  for (const m of rows) {
    const g =
      groups.get(m.name) ??
      ({
        name: m.name,
        tokenCount: 0,
        machineIds: new Set<string>(),
        mostRecent: 0,
      } satisfies Group);

    g.tokenCount += 1;
    if (m.machine_id) g.machineIds.add(m.machine_id);
    const t = m.revoked_at ? new Date(m.revoked_at).getTime() : 0;

    if (t > g.mostRecent) g.mostRecent = t;
    groups.set(m.name, g);
  }

  const sorted = [...groups.values()].sort((a, b) => b.mostRecent - a.mostRecent);
  const totalTokens = rows.length;
  const overallMostRecent = sorted[0]?.mostRecent ?? 0;

  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
        Revoked
        <span className="font-normal normal-case">
          · {totalTokens} {totalTokens === 1 ? "token" : "tokens"} across {groups.size}{" "}
          {groups.size === 1 ? "name" : "names"}
          {overallMostRecent > 0 && ` · last ${fmtAge(Date.now() - overallMostRecent)} ago`}
        </span>
      </h3>
      <div className="rounded-md border border-border/50 bg-muted/20 divide-y divide-border/30 text-sm">
        {sorted.map((g) => (
          <div
            key={g.name}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 opacity-80"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Laptop className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              <span className="font-medium truncate">{g.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
              <span className="whitespace-nowrap">
                {g.tokenCount} {g.tokenCount === 1 ? "token" : "tokens"}
              </span>
              {g.machineIds.size > 1 && (
                <Badge variant="secondary" title="distinct machine_ids — likely re-install churn">
                  {g.machineIds.size} machine_ids
                </Badge>
              )}
              <span className="whitespace-nowrap">{fmtAge(Date.now() - g.mostRecent)} ago</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
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
