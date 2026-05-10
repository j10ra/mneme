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
import { Clock } from "lucide-react";
import { ApiError, apiGet } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { Button } from "./ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.tsx";
import { Switch } from "./ui/switch.tsx";

type LogLevel = "debug" | "info" | "warn" | "error";
type Mode = "local" | "server";

type LocalEntry = {
  kind: "local";
  id: number;
  level: LogLevel;
  text: string;
  /** Absolute ms epoch for histogram bucketing. Parsed from the
   *  HH:MM:SS.ms prefix and lifted to today's date; if the parsed time
   *  is ahead of `now`, it's assumed to be from yesterday. */
  tsMs: number;
};

type ServerEntry = {
  kind: "server";
  id: string;
  ts: string;
  tsMs: number;
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

type RangeOption = { label: string; ms: number | null };
const RANGE_OPTIONS: RangeOption[] = [
  { label: "5 min", ms: 5 * 60_000 },
  { label: "15 min", ms: 15 * 60_000 },
  { label: "30 min", ms: 30 * 60_000 },
  { label: "1 hour", ms: 60 * 60_000 },
  { label: "3 hour", ms: 3 * 60 * 60_000 },
  { label: "6 hour", ms: 6 * 60 * 60_000 },
  { label: "1 day", ms: 24 * 60 * 60_000 },
  { label: "7 day", ms: 7 * 24 * 60 * 60_000 },
  { label: "30 day", ms: 30 * 24 * 60 * 60_000 },
  { label: "all", ms: null },
];

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

// Best-effort cleanup of the previous version's localStorage dedup set.
// Removed in 1.0.84 — the unified daemon.log + 500-line backfill cap
// handles recency naturally; the dedup was over-filtering across
// reloads.
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("mneme.dashboard.seen-local-lines.v1");
  } catch {
    /* ignore */
  }
}

/** Parse `HH:MM:SS.mmm` into an absolute ms epoch.
 *
 *  The daemon's logger writes timestamps via `toISOString().slice(11, 23)`,
 *  which is **UTC**. Local-tz parsing here put every entry ~tz-offset
 *  hours in the past (NZ +12 → 12h skew → 15-min cutoff filtered all).
 *  setUTCHours/UTCDate keeps the parse on the same axis as Date.now(). */
function parsedTimeToMs(time: string | undefined, now = Date.now()): number {
  if (!time) return now;
  const m = time.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
  if (!m) return now;
  const [, h, mn, s, ms] = m;
  const d = new Date(now);
  d.setUTCHours(+h, +mn, +s, +ms);
  if (d.getTime() > now + 60_000) d.setUTCDate(d.getUTCDate() - 1);
  return d.getTime();
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
  const [stickyTail, setStickyTail] = useState(true);
  const [showJump, setShowJump] = useState(false);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(
    new Set(["debug", "info", "warn", "error"]),
  );
  const [hiddenMachines, setHiddenMachines] = useState<Set<string>>(new Set());
  // Histogram bar click → narrows the visible range to [start, end).
  // Cleared by clicking the bar again or hitting the clear pill.
  const [rangeFilter, setRangeFilter] = useState<{
    start: number;
    end: number;
  } | null>(null);
  // Quick-range time selector (5min / 1hr / 1d / all). null = all.
  const [timeRangeMs, setTimeRangeMs] = useState<number | null>(null);

  const localIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stuckToBottomRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  // Keep the freshest stickyTail readable inside SSE/poll callbacks
  // without re-subscribing them every flip.
  const stickyTailRef = useRef(stickyTail);
  useEffect(() => {
    stickyTailRef.current = stickyTail;
  }, [stickyTail]);
  // Buffers new entries that arrived while tail was paused, so resuming
  // doesn't lose anything (matches Railway's pause UX).
  const localBufferRef = useRef<LocalEntry[]>([]);
  const serverBufferRef = useRef<ServerEntry[]>([]);
  const [pausedCount, setPausedCount] = useState(0);

  // ── Local SSE stream ─────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "local") return;
    const es = new EventSource(STREAM_PATH);
    setConn("connecting");

    const onLog = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data) as {
          level: LogLevel;
          text: string;
          backfill?: boolean;
        };
        localIdRef.current += 1;
        // Pull HH:MM:SS.mmm out of the line text for histogram
        // bucketing. Falls back to wall-clock if the parser can't.
        const tsMatch = payload.text.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})/);
        const entry: LocalEntry = {
          kind: "local",
          id: localIdRef.current,
          level: payload.level,
          text: payload.text,
          tsMs: parsedTimeToMs(tsMatch?.[1]),
        };
        if (!stickyTailRef.current) {
          // Tail paused — buffer for drain on resume; cap so a long
          // pause doesn't exhaust memory.
          const buf = localBufferRef.current;
          buf.push(entry);
          if (buf.length > MAX_BUFFER) {
            localBufferRef.current = buf.slice(-MAX_BUFFER);
          }
          setPausedCount(localBufferRef.current.length);
          return;
        }
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
          .map((r) => {
            const tsIso =
              typeof r.ts === "string" ? r.ts : new Date(r.ts).toISOString();
            return {
              kind: "server" as const,
              id: r.id,
              ts: tsIso,
              tsMs: new Date(tsIso).getTime(),
              level: (r.level?.toLowerCase() as LogLevel) ?? "info",
              message: r.message ?? "",
              machine_id: r.machine_id,
              machine_name: r.machine_name,
              span_name: r.span_name,
              trace_id: r.trace_id,
            };
          })
          .reverse(); // server returns DESC; we render ASC for chronological tail
        if (fresh.length > 0) {
          lastTs = fresh[fresh.length - 1]!.ts;
          if (!stickyTailRef.current) {
            // Paused: buffer the new rows for drain on resume.
            const buf = serverBufferRef.current.concat(fresh);
            const seen = new Set<string>();
            const dedup: ServerEntry[] = [];
            for (const e of buf) {
              if (seen.has(e.id)) continue;
              seen.add(e.id);
              dedup.push(e);
            }
            serverBufferRef.current =
              dedup.length > MAX_BUFFER ? dedup.slice(-MAX_BUFFER) : dedup;
            setPausedCount(serverBufferRef.current.length);
          } else {
            setServerEntries((prev) => {
              const merged = prev.concat(fresh);
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

  // Reset per-mode filter affordances when switching mode and snap
  // back to "stuck at bottom" so newly-arrived entries always pin to
  // the latest. Also clear any paused buffer from the prior mode —
  // entries from a different source aren't useful here.
  useEffect(() => {
    setHiddenMachines(new Set());
    setQuery("");
    setRangeFilter(null);
    localBufferRef.current = [];
    serverBufferRef.current = [];
    setPausedCount(0);
    stuckToBottomRef.current = true;
    setShowJump(false);
    const el = scrollRef.current;
    if (el) {
      programmaticScrollRef.current = true;
      el.scrollTop = el.scrollHeight;
    }
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
    const cutoffMs =
      timeRangeMs !== null ? Date.now() - timeRangeMs : -Infinity;
    const inRange = (ts: number): boolean =>
      ts >= cutoffMs &&
      (!rangeFilter || (ts >= rangeFilter.start && ts < rangeFilter.end));
    if (mode === "local") {
      const out: Array<LocalEntry & { parsed: ParsedLine }> = [];
      for (const e of localEntries) {
        if (!levelFilter.has(e.level)) continue;
        if (q && !e.text.toLowerCase().includes(q)) continue;
        if (!inRange(e.tsMs)) continue;
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
      if (!inRange(e.tsMs)) continue;
      out.push(e);
    }
    return out;
  }, [
    mode,
    localEntries,
    serverEntries,
    levelFilter,
    hiddenMachines,
    query,
    rangeFilter,
    timeRangeMs,
  ]);

  // Histogram operates on the unfiltered (sans range) entry list so the
  // user can see the full distribution and click into a bucket. Honors
  // the quick-range cutoff so the histogram + rows scope match.
  const histogramEntries = useMemo<
    Array<{ tsMs: number; level: LogLevel }>
  >(() => {
    const q = query.trim().toLowerCase();
    const cutoffMs =
      timeRangeMs !== null ? Date.now() - timeRangeMs : -Infinity;
    if (mode === "local") {
      const out: Array<{ tsMs: number; level: LogLevel }> = [];
      for (const e of localEntries) {
        if (!levelFilter.has(e.level)) continue;
        if (q && !e.text.toLowerCase().includes(q)) continue;
        if (e.tsMs < cutoffMs) continue;
        out.push({ tsMs: e.tsMs, level: e.level });
      }
      return out;
    }
    const out: Array<{ tsMs: number; level: LogLevel }> = [];
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
      if (e.tsMs < cutoffMs) continue;
      out.push({ tsMs: e.tsMs, level: e.level });
    }
    return out;
  }, [
    mode,
    localEntries,
    serverEntries,
    levelFilter,
    hiddenMachines,
    query,
    timeRangeMs,
  ]);

  // Compute the actual data span across all loaded entries to disable
  // range options that exceed available data.
  const dataSpanMs = useMemo(() => {
    const all = mode === "local" ? localEntries : serverEntries;
    if (all.length === 0) return null;
    let mn = Infinity;
    for (const e of all) if (e.tsMs < mn) mn = e.tsMs;
    return Date.now() - mn;
  }, [mode, localEntries, serverEntries]);

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
    // Drain any entries that arrived while paused, then snap to bottom.
    if (localBufferRef.current.length > 0) {
      const drained = localBufferRef.current;
      localBufferRef.current = [];
      setLocalEntries((prev) => {
        const next = prev.concat(drained);
        return next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next;
      });
    }
    if (serverBufferRef.current.length > 0) {
      const drained = serverBufferRef.current;
      serverBufferRef.current = [];
      setServerEntries((prev) => {
        const merged = prev.concat(drained);
        const seen = new Set<string>();
        const dedup: ServerEntry[] = [];
        for (const e of merged) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          dedup.push(e);
        }
        return dedup.length > MAX_BUFFER ? dedup.slice(-MAX_BUFFER) : dedup;
      });
    }
    setPausedCount(0);
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
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2">
          <div className="flex items-center gap-2">
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as Mode)}
            >
              <SelectTrigger className="min-w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local logs</SelectItem>
                <SelectItem value="server">Server logs</SelectItem>
              </SelectContent>
            </Select>
            <ConnDot state={conn} />
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {visible.length}
              {visible.length !== totalEntries && `/${totalEntries}`}
            </span>
          </div>
          <label className="flex items-center gap-2 text-[11px] select-none cursor-pointer">
            {stickyTail ? (
              <Pause className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Play className="h-3 w-3 text-warning" />
            )}
            <span
              className={cn(
                "uppercase tracking-wider text-[10px]",
                stickyTail ? "text-muted-foreground" : "text-warning",
              )}
            >
              {stickyTail ? "live" : "paused"}
            </span>
            {pausedCount > 0 && !stickyTail && (
              <span className="rounded-full bg-warning/20 px-1.5 text-[10px] font-medium text-warning tabular-nums">
                +{pausedCount}
              </span>
            )}
            <Switch
              checked={stickyTail}
              onCheckedChange={(v) => setStickyTail(v)}
            />
          </label>
        </div>

        <div className="flex items-center gap-2 px-3 pb-2">
          <div className="relative flex h-7 flex-1 items-center rounded-md border border-border/60 bg-transparent focus-within:border-border focus-within:bg-card/50 transition-colors">
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
          <RangePicker
            value={timeRangeMs}
            onChange={setTimeRangeMs}
            dataSpanMs={dataSpanMs}
          />
        </div>

        {/* Level filters — visually tied to the histogram below. */}
        <div className="flex flex-wrap items-center gap-0.5 px-3 pb-1 text-[10px]">
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

        {histogramEntries.length > 0 && (
          <Histogram
            entries={histogramEntries}
            range={rangeFilter}
            onSelectBucket={(start, end) =>
              setRangeFilter((cur) =>
                cur && cur.start === start && cur.end === end
                  ? null
                  : { start, end },
              )
            }
            onClear={() => setRangeFilter(null)}
          />
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
          <ul className="px-1 py-1 space-y-1">
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

function Histogram({
  entries,
  range,
  onSelectBucket,
  onClear,
}: {
  entries: Array<{ tsMs: number; level: LogLevel }>;
  range: { start: number; end: number } | null;
  onSelectBucket: (start: number, end: number) => void;
  onClear: () => void;
}) {
  const BUCKETS = 140;
  const HEIGHT = 36;
  type Bucket = {
    info: number;
    warn: number;
    error: number;
    debug: number;
    total: number;
    start: number;
    end: number;
  };

  const data = useMemo(() => {
    if (entries.length === 0) {
      return { buckets: [] as Bucket[], minTs: 0, maxTs: 0, maxCount: 0 };
    }
    let mn = Infinity;
    let mx = -Infinity;
    for (const e of entries) {
      if (e.tsMs < mn) mn = e.tsMs;
      if (e.tsMs > mx) mx = e.tsMs;
    }
    if (mn === mx) mx = mn + 1;
    const size = (mx - mn) / BUCKETS;
    const bks: Bucket[] = Array.from({ length: BUCKETS }, (_, i) => ({
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
      total: 0,
      start: mn + i * size,
      end: mn + (i + 1) * size,
    }));
    for (const e of entries) {
      let i = Math.floor((e.tsMs - mn) / size);
      if (i >= BUCKETS) i = BUCKETS - 1;
      if (i < 0) i = 0;
      bks[i]![e.level] += 1;
      bks[i]!.total += 1;
    }
    let mc = 0;
    for (const b of bks) if (b.total > mc) mc = b.total;
    return { buckets: bks, minTs: mn, maxTs: mx, maxCount: mc };
  }, [entries]);

  if (data.buckets.length === 0 || data.maxCount === 0) return null;

  // Format in UTC to match the daemon log's wall-clock so axis labels
  // line up with the inline row timestamps.
  const fmt = (ts: number) => {
    const d = new Date(ts);
    return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
      .map((n) => n.toString().padStart(2, "0"))
      .join(":");
  };

  const hasRange = !!range;

  return (
    <div className="px-3 pb-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${BUCKETS} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="w-full cursor-pointer"
          style={{ height: HEIGHT }}
        >
          {data.buckets.map((b, i) => {
            const isInRange =
              hasRange && b.start >= range!.start && b.end <= range!.end;
            const dimmed = hasRange && !isInRange;
            const nonError = b.info + b.warn + b.debug;
            const baseline = HEIGHT - 1;
            const cx = i + 0.5;
            const stroke = 0.18;
            // Empty bucket — a tiny horizontal tick at the baseline so
            // the time axis reads continuously (Railway-style).
            if (b.total === 0) {
              return (
                <g key={i} onClick={() => onSelectBucket(b.start, b.end)}>
                  <rect
                    x={i}
                    y={0}
                    width={1}
                    height={HEIGHT}
                    className={cn(
                      "fill-transparent hover:fill-foreground/5",
                      isInRange && "fill-foreground/10",
                    )}
                  >
                    <title>{fmt(b.start)} · 0 entries</title>
                  </rect>
                  <line
                    x1={i + 0.25}
                    x2={i + 0.75}
                    y1={baseline}
                    y2={baseline}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    className={cn(
                      "stroke-muted-foreground/50",
                      dimmed && "opacity-30",
                    )}
                  />
                </g>
              );
            }
            // Vertical line bar: non-error segment from baseline up,
            // optional red error segment stacked above it.
            const nonErrH = (nonError / data.maxCount) * (HEIGHT - 1);
            const errH = (b.error / data.maxCount) * (HEIGHT - 1);
            const segs: React.ReactNode[] = [];
            if (nonErrH > 0) {
              segs.push(
                <line
                  key="ok"
                  x1={cx}
                  x2={cx}
                  y1={baseline}
                  y2={baseline - nonErrH}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  className={cn(
                    "stroke-sky-500",
                    dimmed && "opacity-30",
                  )}
                />,
              );
            }
            if (errH > 0) {
              segs.push(
                <line
                  key="err"
                  x1={cx}
                  x2={cx}
                  y1={baseline - nonErrH}
                  y2={baseline - nonErrH - errH}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  className={cn(
                    "stroke-destructive",
                    dimmed && "opacity-30",
                  )}
                />,
              );
            }
            return (
              <g key={i} onClick={() => onSelectBucket(b.start, b.end)}>
                <rect
                  x={i}
                  y={0}
                  width={1}
                  height={HEIGHT}
                  className={cn(
                    "fill-transparent hover:fill-foreground/5",
                    isInRange && "fill-foreground/10",
                  )}
                >
                  <title>
                    {fmt(b.start)} · {b.total}{" "}
                    {b.total === 1 ? "entry" : "entries"}
                    {b.error > 0 ? ` · ${b.error} error` : ""}
                    {b.warn > 0 ? ` · ${b.warn} warn` : ""}
                  </title>
                </rect>
                {segs}
              </g>
            );
          })}
        </svg>
        <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground tabular-nums">
          <span>{fmt(data.minTs)}</span>
          <span>{fmt(data.maxTs)}</span>
        </div>
        {hasRange && (
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1 right-0 rounded-md border border-border bg-card px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-foreground"
          >
            clear range
          </button>
        )}
      </div>
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
  // Active = a small leading dot in the tone color + bright text on the
  // shared chip background. Inactive = strikethrough-ish dim with no
  // dot. Same visual language as the machine chips, no heavy outlines.
  const dot = {
    default: "bg-sky-400",
    warning: "bg-warning",
    destructive: "bg-destructive",
    muted: "bg-muted-foreground/60",
  }[tone];
  const text = active
    ? {
        default: "text-sky-400",
        warning: "text-warning",
        destructive: "text-destructive",
        muted: "text-foreground/80",
      }[tone]
    : "text-muted-foreground/50";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-full px-2 uppercase tracking-wider transition-colors hover:bg-muted/40",
        text,
      )}
    >
      <span
        className={cn(
          "inline-block h-1 w-1 rounded-full transition-opacity",
          dot,
          !active && "opacity-25",
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

function RangePicker({
  value,
  onChange,
  dataSpanMs,
}: {
  value: number | null;
  onChange: (ms: number | null) => void;
  dataSpanMs: number | null;
}) {
  const [open, setOpen] = useState(false);
  const current = RANGE_OPTIONS.find((o) => o.ms === value) ?? RANGE_OPTIONS[RANGE_OPTIONS.length - 1]!;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2 text-[11px] font-medium text-muted-foreground hover:border-border hover:bg-card/50 hover:text-foreground transition-colors data-[popup-open]:border-border data-[popup-open]:bg-card/50 data-[popup-open]:text-foreground"
          >
            <Clock className="h-3 w-3" />
            <span>{current.label}</span>
          </button>
        }
      />
      <PopoverContent className="p-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
          Quick range
        </div>
        <div className="grid grid-cols-3 gap-1">
          {RANGE_OPTIONS.map((opt) => {
            const isActive = opt.ms === value;
            const exceedsData =
              opt.ms !== null && dataSpanMs !== null && opt.ms > dataSpanMs * 1.5;
            return (
              <button
                key={opt.label}
                type="button"
                disabled={exceedsData}
                onClick={() => {
                  onChange(opt.ms);
                  setOpen(false);
                }}
                className={cn(
                  "h-7 rounded-md border px-2 text-[11px] transition-colors",
                  isActive
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-400"
                    : "border-border/60 text-foreground hover:bg-muted/40",
                  exceedsData && "opacity-30 cursor-not-allowed",
                )}
                title={
                  exceedsData
                    ? "exceeds available data"
                    : undefined
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
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
