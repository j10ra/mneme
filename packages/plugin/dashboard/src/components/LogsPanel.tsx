// Logs panel — portrait sidebar with two data sources:
//
//   "local"  : SSE tail of ~/.mneme/logs/daemon.{out,err}.log on this
//              machine. Live, infinite, parsed into the structured
//              row format.
//
//   "server" : polled fetch of /dashboard/api/server-logs (proxies
//              /api/_ops/logs) — last 5 minutes by default, refreshed
//              every 5s. Cross-machine: each row carries the machine
//              that emitted the log, surfaced as a clickable filter
//              tag at the top of the panel.
//
// Both modes share the row-renderer chrome; the line parser only
// applies to local logs (server logs already arrive structured).

import { ChevronDown, Pause, Play, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiGet } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { Button } from "./ui/button.tsx";
import { Switch } from "./ui/switch.tsx";

type LogLevel = "debug" | "info" | "warn" | "error";
type Mode = "local" | "server";

type LocalEntry = {
  kind: "local";
  id: number;
  source: "out" | "err";
  level: LogLevel;
  text: string;
};

type ServerEntry = {
  kind: "server";
  id: string;
  ts: string;
  level: LogLevel;
  message: string;
  machine_id: string | null;
  machine_name: string | null;
  span_name: string | null;
  trace_id: string | null;
};

type Entry = LocalEntry | ServerEntry;

type ConnState = "connecting" | "live" | "disconnected";

const MAX_BUFFER = 5_000;
const STREAM_PATH = "/dashboard/api/logs/stream";
const SERVER_POLL_MS = 5_000;
const SERVER_LOOKBACK_MS = 5 * 60_000; // first poll asks for last 5 min

// ── line parser (local logs only) ──────────────────────────────────
type ParsedLine = {
  time?: string;
  level: LogLevel;
  traceId?: string;
  body: string;
  pairs: Array<[string, string]>;
  errorTail?: string;
};

const LINE_RE =
  /^(\d{2}:\d{2}:\d{2}\.\d{3})\s+(DEBUG|INFO|WARN|ERROR)\s+(?:\[([0-9a-f]+)\]\s+)?(.*)$/;

function parseLocal(entry: LocalEntry): ParsedLine {
  const m = entry.text.match(LINE_RE);
  if (!m) return { level: entry.level, body: entry.text, pairs: [] };
  const [, time, levelRaw, traceId, rest] = m;
  let body = rest ?? "";
  let errorTail: string | undefined;
  const sep = body.indexOf(" :: ");
  if (sep >= 0) {
    errorTail = body.slice(sep + 4).trim();
    body = body.slice(0, sep).trim();
  }
  const pairs: Array<[string, string]> = [];
  const remaining: string[] = [];
  for (const tok of body.split(/\s+/)) {
    if (!tok) continue;
    const eq = tok.indexOf("=");
    if (eq > 0 && /^[a-zA-Z_][\w.-]*$/.test(tok.slice(0, eq))) {
      pairs.push([tok.slice(0, eq), tok.slice(eq + 1)]);
    } else {
      remaining.push(tok);
    }
  }
  return {
    time,
    level: (levelRaw.toLowerCase() as LogLevel) ?? entry.level,
    traceId,
    body: remaining.join(" "),
    pairs,
    errorTail,
  };
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function LogsPanel() {
  const [mode, setMode] = useState<Mode>("local");
  const [localEntries, setLocalEntries] = useState<LocalEntry[]>([]);
  const [serverEntries, setServerEntries] = useState<ServerEntry[]>([]);
  const [conn, setConn] = useState<ConnState>("connecting");
  const [showOut, setShowOut] = useState(true);
  const [showErr, setShowErr] = useState(true);
  const [stickyTail, setStickyTail] = useState(true);
  const [showJump, setShowJump] = useState(false);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(
    new Set(["debug", "info", "warn", "error"]),
  );
  const [hiddenMachines, setHiddenMachines] = useState<Set<string>>(new Set());

  const localIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stuckToBottomRef = useRef(true);
  const programmaticScrollRef = useRef(false);

  // ── Local SSE stream ─────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "local") return;
    const es = new EventSource(STREAM_PATH);
    setConn("connecting");

    const onLog = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data) as {
          source: "out" | "err";
          level: LogLevel;
          text: string;
        };
        localIdRef.current += 1;
        const entry: LocalEntry = { kind: "local", id: localIdRef.current, ...payload };
        setLocalEntries((prev) => {
          const next = prev.concat(entry);
          return next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next;
        });
      } catch {
        /* ignore malformed */
      }
    };
    const onReady = () => setConn("live");
    const onPing = () => setConn("live");
    const onError = () => setConn("disconnected");

    es.addEventListener("log", onLog as EventListener);
    es.addEventListener("ready", onReady);
    es.addEventListener("ping", onPing);
    es.addEventListener("error", onError);

    return () => {
      es.removeEventListener("log", onLog as EventListener);
      es.removeEventListener("ready", onReady);
      es.removeEventListener("ping", onPing);
      es.removeEventListener("error", onError);
      es.close();
    };
  }, [mode]);

  // ── Server polling ───────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "server") return;
    let cancelled = false;
    let lastTs: string | null = null;
    setConn("connecting");

    const tick = async () => {
      try {
        const since =
          lastTs ?? new Date(Date.now() - SERVER_LOOKBACK_MS).toISOString();
        const resp = await apiGet<{
          logs: Array<{
            id: string;
            ts: string;
            level: string;
            message: string;
            trace_id: string | null;
            span_id: string | null;
            machine_id: string | null;
            machine_name: string | null;
            span_name: string | null;
          }>;
        }>(`/server-logs?since=${encodeURIComponent(since)}&limit=500`);
        if (cancelled) return;
        const fresh: ServerEntry[] = resp.logs
          .map((r) => ({
            kind: "server" as const,
            id: r.id,
            ts: typeof r.ts === "string" ? r.ts : new Date(r.ts).toISOString(),
            level: (r.level?.toLowerCase() as LogLevel) ?? "info",
            message: r.message ?? "",
            machine_id: r.machine_id,
            machine_name: r.machine_name,
            span_name: r.span_name,
            trace_id: r.trace_id,
          }))
          .reverse(); // server returns DESC; we render ASC for chronological tail
        if (fresh.length > 0) {
          lastTs = fresh[fresh.length - 1]!.ts;
          setServerEntries((prev) => {
            const merged = prev.concat(fresh);
            // Dedupe by id (in case overlap on the boundary).
            const seen = new Set<string>();
            const dedup: ServerEntry[] = [];
            for (const e of merged) {
              if (seen.has(e.id)) continue;
              seen.add(e.id);
              dedup.push(e);
            }
            return dedup.length > MAX_BUFFER
              ? dedup.slice(-MAX_BUFFER)
              : dedup;
          });
        }
        setConn("live");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setConn("disconnected");
      }
    };
    void tick();
    const id = setInterval(tick, SERVER_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mode]);

  // Reset per-mode filter affordances when switching mode.
  useEffect(() => {
    setHiddenMachines(new Set());
    setQuery("");
  }, [mode]);

  // ── Distinct machine list (server mode) ──────────────────────────
  const machines = useMemo(() => {
    if (mode !== "server") return [];
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const e of serverEntries) {
      const id = e.machine_id ?? "_unattributed";
      const name = e.machine_name ?? (e.machine_id ? e.machine_id.slice(0, 8) : "(server)");
      const cur = map.get(id);
      if (cur) cur.count += 1;
      else map.set(id, { id, name, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [mode, serverEntries]);

  // ── Filter pipeline (per-mode) ───────────────────────────────────
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (mode === "local") {
      const out: Array<LocalEntry & { parsed: ParsedLine }> = [];
      for (const e of localEntries) {
        if (e.source === "out" && !showOut) continue;
        if (e.source === "err" && !showErr) continue;
        if (!levelFilter.has(e.level)) continue;
        if (q && !e.text.toLowerCase().includes(q)) continue;
        out.push({ ...e, parsed: parseLocal(e) });
      }
      return out;
    }
    const out: ServerEntry[] = [];
    for (const e of serverEntries) {
      if (!levelFilter.has(e.level)) continue;
      const machineKey = e.machine_id ?? "_unattributed";
      if (hiddenMachines.has(machineKey)) continue;
      if (
        q &&
        !(`${e.message} ${e.span_name ?? ""} ${e.machine_name ?? ""}`)
          .toLowerCase()
          .includes(q)
      ) {
        continue;
      }
      out.push(e);
    }
    return out;
  }, [
    mode,
    localEntries,
    serverEntries,
    showOut,
    showErr,
    levelFilter,
    hiddenMachines,
    query,
  ]);

  const totalEntries =
    mode === "local" ? localEntries.length : serverEntries.length;

  // ── Auto-scroll on new content ───────────────────────────────────
  useEffect(() => {
    if (!stickyTail || !stuckToBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      programmaticScrollRef.current = true;
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [visible, stickyTail]);

  useEffect(() => {
    if (!stickyTail) return;
    stuckToBottomRef.current = true;
    setShowJump(false);
    const el = scrollRef.current;
    if (!el) return;
    programmaticScrollRef.current = true;
    el.scrollTop = el.scrollHeight;
  }, [stickyTail]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    if (programmaticScrollRef.current) {
      programmaticScrollRef.current = false;
      return;
    }
    const el = e.currentTarget;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 24;
    stuckToBottomRef.current = atBottom;
    setShowJump(!atBottom);
  }

  function jumpToBottom() {
    stuckToBottomRef.current = true;
    setShowJump(false);
    const el = scrollRef.current;
    if (!el) return;
    programmaticScrollRef.current = true;
    el.scrollTop = el.scrollHeight;
  }

  function toggleLevel(l: LogLevel) {
    setLevelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  }

  function toggleMachine(id: string) {
    setHiddenMachines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative flex h-full flex-col bg-muted/20">
      <div className="sticky top-0 z-10 border-b border-border bg-muted/80 backdrop-blur">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2">
          <div className="flex items-center gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="h-7 rounded-md border border-border bg-card px-2 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/20"
            >
              <option value="local">Local logs</option>
              <option value="server">Server logs</option>
            </select>
            <ConnDot state={conn} />
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {visible.length}
              {visible.length !== totalEntries && `/${totalEntries}`}
            </span>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground select-none cursor-pointer">
            {stickyTail ? (
              <Play className="h-3 w-3 text-success" />
            ) : (
              <Pause className="h-3 w-3" />
            )}
            tail
            <Switch
              checked={stickyTail}
              onCheckedChange={(v) => setStickyTail(v)}
            />
          </label>
        </div>

        <div className="px-3 pb-2">
          <div className="relative flex h-7 items-center rounded-md border border-border bg-card">
            <Search className="ml-2 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === "local" ? "filter local logs" : "filter server logs"
              }
              className="flex-1 bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mr-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Level + source/machine filters */}
        <div className="flex flex-wrap items-center gap-1 px-3 pb-2.5 text-[10px]">
          <LevelChip
            label="info"
            active={levelFilter.has("info")}
            onClick={() => toggleLevel("info")}
            tone="default"
          />
          <LevelChip
            label="warn"
            active={levelFilter.has("warn")}
            onClick={() => toggleLevel("warn")}
            tone="warning"
          />
          <LevelChip
            label="error"
            active={levelFilter.has("error")}
            onClick={() => toggleLevel("error")}
            tone="destructive"
          />
          <LevelChip
            label="debug"
            active={levelFilter.has("debug")}
            onClick={() => toggleLevel("debug")}
            tone="muted"
          />

          {mode === "local" && (
            <>
              <span className="mx-1 h-3 w-px bg-border" />
              <SourceChip
                label="out"
                checked={showOut}
                onClick={() => setShowOut((v) => !v)}
              />
              <SourceChip
                label="err"
                checked={showErr}
                onClick={() => setShowErr((v) => !v)}
              />
            </>
          )}
        </div>

        {mode === "server" && machines.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 px-3 pb-2.5 text-[10px]">
            <span className="text-muted-foreground/70 uppercase tracking-wider mr-1">
              machines
            </span>
            {machines.map((m) => (
              <MachineChip
                key={m.id}
                label={m.name}
                count={m.count}
                hidden={hiddenMachines.has(m.id)}
                onClick={() => toggleMachine(m.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-background text-[11px]"
      >
        {visible.length === 0 ? (
          <div className="p-3 text-muted-foreground">
            {totalEntries === 0
              ? conn === "connecting"
                ? "Connecting…"
                : conn === "disconnected"
                  ? "Stream disconnected. Will retry automatically."
                  : "Waiting for log lines."
              : "No logs match the current filters."}
          </div>
        ) : (
          <ul className="px-1 py-1">
            {visible.map((e) =>
              e.kind === "local" ? (
                <LocalRow key={`l-${e.id}`} entry={e} parsed={e.parsed} />
              ) : (
                <ServerRow key={`s-${e.id}`} entry={e} />
              ),
            )}
          </ul>
        )}
      </div>

      {showJump && (
        <Button
          size="xs"
          onClick={jumpToBottom}
          className="absolute bottom-3 right-3 shadow-md"
        >
          <ChevronDown className="h-3 w-3" />
          jump to live
        </Button>
      )}
    </div>
  );
}

function levelStyles(level: LogLevel): { border: string; level: string; body: string } {
  return {
    border: {
      info: "border-l-sky-500/50",
      warn: "border-l-warning/70",
      error: "border-l-destructive/80",
      debug: "border-l-muted-foreground/30",
    }[level],
    level: {
      info: "text-sky-500/80",
      warn: "text-warning",
      error: "text-destructive",
      debug: "text-muted-foreground/60",
    }[level],
    body: {
      info: "",
      warn: "text-warning",
      error: "text-destructive",
      debug: "text-muted-foreground/80",
    }[level],
  };
}

function LocalRow({
  entry,
  parsed,
}: {
  entry: LocalEntry;
  parsed: ParsedLine;
}) {
  const styles = levelStyles(parsed.level);
  return (
    <li className={cn("border-l-2 px-2 py-1 hover:bg-muted/30", styles.border)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground tabular-nums">
        {parsed.time && <span className="font-mono">{parsed.time}</span>}
        <span className={cn("font-mono uppercase tracking-wider", styles.level)}>
          {parsed.level}
        </span>
        {parsed.traceId && (
          <span className="font-mono opacity-70">{parsed.traceId.slice(0, 8)}</span>
        )}
        {entry.source === "err" && (
          <span className="rounded bg-warning/20 px-1 text-[9px] text-warning">stderr</span>
        )}
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono">
        {parsed.body && (
          <span className={cn("font-medium", styles.body)}>{parsed.body}</span>
        )}
        {parsed.pairs.map(([k, v], i) => (
          <span key={`${k}-${i}`} className="whitespace-nowrap">
            <span className="text-muted-foreground/60">{k}:</span>{" "}
            <span
              className={cn(
                "break-all",
                k === "machine_id" ||
                  k === "traceId" ||
                  k === "spanId" ||
                  k === "session"
                  ? "text-muted-foreground"
                  : "text-foreground/90",
              )}
            >
              {v}
            </span>
          </span>
        ))}
        {parsed.errorTail && (
          <span className="text-destructive">:: {parsed.errorTail}</span>
        )}
      </div>
    </li>
  );
}

function ServerRow({ entry }: { entry: ServerEntry }) {
  const styles = levelStyles(entry.level);
  const machineLabel =
    entry.machine_name ??
    (entry.machine_id ? entry.machine_id.slice(0, 8) : "server");
  return (
    <li className={cn("border-l-2 px-2 py-1 hover:bg-muted/30", styles.border)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground tabular-nums">
        <span className="font-mono">{fmtTime(entry.ts)}</span>
        <span className={cn("font-mono uppercase tracking-wider", styles.level)}>
          {entry.level}
        </span>
        <span className="rounded bg-muted/60 px-1 text-[9px] font-medium text-foreground/80">
          {machineLabel}
        </span>
        {entry.span_name && (
          <span className="font-mono opacity-70">{entry.span_name}</span>
        )}
        {entry.trace_id && (
          <span className="font-mono opacity-50">{entry.trace_id.slice(0, 8)}</span>
        )}
      </div>
      <div className="mt-0.5 font-mono">
        <span className={cn("font-medium break-words", styles.body)}>
          {entry.message}
        </span>
      </div>
    </li>
  );
}

function LevelChip({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone: "default" | "warning" | "destructive" | "muted";
}) {
  const activeStyles = {
    default: "border-sky-500/40 bg-sky-500/10 text-sky-500/90",
    warning: "border-warning/40 bg-warning/10 text-warning",
    destructive: "border-destructive/50 bg-destructive/10 text-destructive",
    muted: "border-border bg-muted/40 text-muted-foreground",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-5 rounded-md border px-1.5 uppercase tracking-wider transition-colors",
        active
          ? activeStyles
          : "border-border/60 bg-transparent text-muted-foreground/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function SourceChip({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-md border px-1.5 transition-colors",
        checked
          ? "border-border bg-card text-foreground"
          : "border-border/40 bg-transparent text-muted-foreground/50 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "inline-block h-1 w-1 rounded-full",
          checked ? "bg-foreground" : "bg-muted-foreground/40",
        )}
      />
      {label}
    </button>
  );
}

function MachineChip({
  label,
  count,
  hidden,
  onClick,
}: {
  label: string;
  count: number;
  hidden: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-full border px-2 normal-case tracking-normal transition-colors",
        hidden
          ? "border-border/40 bg-transparent text-muted-foreground/50 line-through hover:text-foreground hover:line-through"
          : "border-border bg-card text-foreground",
      )}
      title={hidden ? "click to show" : "click to hide"}
    >
      <span
        className={cn(
          "inline-block h-1 w-1 rounded-full",
          hidden ? "bg-muted-foreground/30" : "bg-success",
        )}
      />
      {label}
      <span className="text-muted-foreground tabular-nums">{count}</span>
    </button>
  );
}

function ConnDot({ state }: { state: ConnState }) {
  return (
    <span
      title={state}
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        state === "live" && "bg-success",
        state === "connecting" && "bg-warning animate-pulse",
        state === "disconnected" && "bg-destructive",
      )}
    />
  );
}
