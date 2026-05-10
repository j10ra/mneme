// Logs panel — portrait right sidebar. Live SSE tail of the daemon's
// local log files (~/.mneme/logs/daemon.{out,err}.log). Backfills the
// last ~32KB on connect, then streams new lines as they're written.
//
// UX:
//   - sticky-tail toggle: when ON and the user hasn't manually scrolled
//     up, new lines auto-scroll into view. Manual scroll-up disables
//     auto-scroll until re-enabled.
//   - source filter: out / err checkboxes
//   - level color: ERROR red, WARN amber, INFO normal, DEBUG dim
//
// Connection state: connecting / live / disconnected (auto-reconnect via
// browser-native EventSource retry — we just surface the state).

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/cn.ts";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogEntry = {
  id: number;
  source: "out" | "err";
  level: LogLevel;
  text: string;
};

type ConnState = "connecting" | "live" | "disconnected";

const MAX_BUFFER = 5_000;
const STREAM_PATH = "/dashboard/api/logs/stream";

export function LogsPanel() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [conn, setConn] = useState<ConnState>("connecting");
  const [showOut, setShowOut] = useState(true);
  const [showErr, setShowErr] = useState(true);
  const [stickyTail, setStickyTail] = useState(true);

  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const userScrolledUpRef = useRef(false);

  // ── SSE connection ─────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource(STREAM_PATH);
    setConn("connecting");

    const onLog = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data) as {
          source: "out" | "err";
          level: LogLevel;
          text: string;
        };
        idRef.current += 1;
        const entry: LogEntry = { id: idRef.current, ...payload };
        setEntries((prev) => {
          const next = prev.concat(entry);
          return next.length > MAX_BUFFER
            ? next.slice(next.length - MAX_BUFFER)
            : next;
        });
      } catch {
        // ignore malformed
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
  }, []);

  // ── Filtered view ───────────────────────────────────────────────
  const visible = useMemo(
    () =>
      entries.filter(
        (e) => (e.source === "out" && showOut) || (e.source === "err" && showErr),
      ),
    [entries, showOut, showErr],
  );

  // ── Sticky-tail autoscroll ──────────────────────────────────────
  useEffect(() => {
    if (!stickyTail || userScrolledUpRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visible, stickyTail]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 24;
  }

  function jumpToBottom() {
    userScrolledUpRef.current = false;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header — sticky */}
      <div className="sticky top-0 z-10 border-b border-border bg-muted/80 backdrop-blur">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Logs</h2>
            <ConnDot state={conn} />
          </div>
          <button
            type="button"
            onClick={() => setStickyTail((v) => !v)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider transition",
              stickyTail
                ? "border-success/40 bg-success/10 text-success"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
            title="Auto-scroll to newest"
          >
            tail {stickyTail ? "on" : "off"}
          </button>
        </div>
        <div className="flex items-center gap-3 px-3 pb-3 text-[11px] text-muted-foreground">
          <SourceToggle
            label="out"
            checked={showOut}
            onToggle={() => setShowOut((v) => !v)}
          />
          <SourceToggle
            label="err"
            checked={showErr}
            onToggle={() => setShowErr((v) => !v)}
          />
          <span className="ml-auto font-mono">
            {visible.length}
            {visible.length !== entries.length && `/${entries.length}`}
          </span>
        </div>
      </div>

      {/* Body — scroll container */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-background font-mono text-[11px] leading-snug"
      >
        {visible.length === 0 ? (
          <div className="p-3 text-muted-foreground">
            {conn === "connecting"
              ? "Connecting to log stream…"
              : conn === "disconnected"
                ? "Stream disconnected. Browser will retry automatically."
                : "Waiting for log lines."}
          </div>
        ) : (
          <ul className="px-3 py-2">
            {visible.map((e) => (
              <Line key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </div>

      {/* Floating jump-to-bottom when user has scrolled up */}
      {userScrolledUpRef.current && stickyTail && (
        <button
          type="button"
          onClick={jumpToBottom}
          className="absolute bottom-3 right-3 rounded-md border border-border bg-card px-2 py-1 text-[11px] shadow"
        >
          ↓ jump to live
        </button>
      )}
    </div>
  );
}

function Line({ entry }: { entry: LogEntry }) {
  return (
    <li
      className={cn(
        "whitespace-pre-wrap break-all border-l-2 pl-2 py-0.5",
        entry.source === "err" ? "border-l-warning/60" : "border-l-transparent",
        entry.level === "error" && "text-destructive",
        entry.level === "warn" && "text-warning",
        entry.level === "debug" && "text-muted-foreground/70",
      )}
    >
      {entry.text}
    </li>
  );
}

function SourceToggle({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 transition",
        checked
          ? "border-border bg-card text-foreground"
          : "border-border/50 bg-transparent text-muted-foreground/60 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          checked ? "bg-foreground" : "bg-muted-foreground/40",
        )}
      />
      {label}
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
