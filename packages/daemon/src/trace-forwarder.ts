// Daemon-side TraceSink that buffers spans / traces / logs and POSTs
// them to the server's /api/ingest/spans in batches. Same per-trace
// bucket pattern as packages/core/TraceStore: child spans accumulate
// in pendingSpans[traceId] until pushTrace finalizes the parent, then
// the whole bundle flushes together so the server's tx inserts the
// trace row before the spans that FK to it.
//
// Failure model: spans are best-effort observability. On HTTP failure
// (network, 5xx, auth) we drop the batch with a stderr warning rather
// than retrying forever — if the daemon's tracing wedges its own
// pipeline, it stops being useful. 4xx on a malformed span shape
// fails the same way.

import { Logger } from "@mneme/core";
import type {
  LogRecord,
  SpanRecord,
  TraceRecord,
  TraceSink,
} from "@mneme/core";
import { isNetworkOfflineError } from "./net.ts";

// Same ceilings as TraceStore. Daemon runs alone on a personal box,
// not under multi-tenant load, but the bounds protect against a
// runaway producer (e.g. a stage tick that never returns).
const MAX_PENDING_SPANS_PER_TRACE = 1000;
const MAX_PENDING_TRACES = 200;
const RECENT_TRACE_LRU_SIZE = 1024;

type ForwarderOpts = {
  serverUrl: string;
  token: string;
  /** ms between scheduled flush attempts. Default 5s. */
  flushIntervalMs?: number;
  /** Force a flush once buffered total crosses this. Default 100. */
  maxBatchSize?: number;
  /** Lets tests inject a fake fetch. Defaults to global fetch. */
  fetch?: typeof fetch;
};

export class TraceForwarder implements TraceSink {
  private serverUrl: string;
  private token: string;
  private flushIntervalMs: number;
  private maxBatchSize: number;
  private fetchImpl: typeof fetch;
  private timer: ReturnType<typeof setInterval> | null = null;

  // Flush-ready (trace finalized — safe to send to server).
  private traceBuffer: TraceRecord[] = [];
  private spanBuffer: SpanRecord[] = [];
  private logBuffer: LogRecord[] = [];

  // Pending per-trace until pushTrace fires for that traceId.
  private pendingSpans = new Map<string, SpanRecord[]>();
  private pendingLogs = new Map<string, LogRecord[]>();
  private recentlyFinalized = new Map<string, true>();

  constructor(opts: ForwarderOpts) {
    this.serverUrl = opts.serverUrl.replace(/\/$/, "");
    this.token = opts.token;
    this.flushIntervalMs = opts.flushIntervalMs ?? 5000;
    this.maxBatchSize = opts.maxBatchSize ?? 100;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.pendingSpans.clear();
    this.pendingLogs.clear();
    await this.flush();
  }

  pushTrace(t: TraceRecord): void {
    const spans = this.pendingSpans.get(t.traceId);
    if (spans) {
      this.spanBuffer.push(...spans);
      this.pendingSpans.delete(t.traceId);
    }
    const logs = this.pendingLogs.get(t.traceId);
    if (logs) {
      this.logBuffer.push(...logs);
      this.pendingLogs.delete(t.traceId);
    }
    this.traceBuffer.push(t);
    this.markFinalized(t.traceId);
    this.maybeFlushOverflow();
  }

  pushSpan(s: SpanRecord): void {
    if (this.recentlyFinalized.has(s.traceId)) {
      this.spanBuffer.push(s);
      this.maybeFlushOverflow();
      return;
    }
    let bucket = this.pendingSpans.get(s.traceId);
    if (!bucket) {
      if (this.pendingSpans.size >= MAX_PENDING_TRACES) {
        const firstKey = this.pendingSpans.keys().next().value as
          | string
          | undefined;
        if (firstKey !== undefined) this.pendingSpans.delete(firstKey);
      }
      bucket = [];
      this.pendingSpans.set(s.traceId, bucket);
    }
    if (bucket.length >= MAX_PENDING_SPANS_PER_TRACE) bucket.shift();
    bucket.push(s);
    this.maybeFlushOverflow();
  }

  pushLog(l: LogRecord): void {
    if (!l.traceId) {
      this.logBuffer.push(l);
      this.maybeFlushOverflow();
      return;
    }
    if (this.recentlyFinalized.has(l.traceId)) {
      this.logBuffer.push(l);
      this.maybeFlushOverflow();
      return;
    }
    let bucket = this.pendingLogs.get(l.traceId);
    if (!bucket) {
      if (this.pendingLogs.size >= MAX_PENDING_TRACES) {
        const firstKey = this.pendingLogs.keys().next().value as
          | string
          | undefined;
        if (firstKey !== undefined) this.pendingLogs.delete(firstKey);
      }
      bucket = [];
      this.pendingLogs.set(l.traceId, bucket);
    }
    if (bucket.length >= MAX_PENDING_SPANS_PER_TRACE) bucket.shift();
    bucket.push(l);
    this.maybeFlushOverflow();
  }

  private markFinalized(traceId: string): void {
    if (this.recentlyFinalized.has(traceId)) {
      this.recentlyFinalized.delete(traceId);
    }
    this.recentlyFinalized.set(traceId, true);
    if (this.recentlyFinalized.size > RECENT_TRACE_LRU_SIZE) {
      const oldest = this.recentlyFinalized.keys().next().value as
        | string
        | undefined;
      if (oldest !== undefined) this.recentlyFinalized.delete(oldest);
    }
  }

  private maybeFlushOverflow(): void {
    const total =
      this.traceBuffer.length + this.spanBuffer.length + this.logBuffer.length;
    if (total >= this.maxBatchSize) void this.flush();
  }

  async flush(): Promise<void> {
    const traces = this.traceBuffer.splice(0);
    const spans = this.spanBuffer.splice(0);
    const logs = this.logBuffer.splice(0);
    if (traces.length === 0 && spans.length === 0 && logs.length === 0) return;

    const body = JSON.stringify({ traces, spans, logs });
    try {
      const response = await this.fetchImpl(
        `${this.serverUrl}/api/ingest/spans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body,
        },
      );
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        Logger.warn("trace-forwarder: server rejected batch", undefined, {
          status: response.status,
          detail: text.slice(0, 200),
          traces: traces.length,
          spans: spans.length,
          logs: logs.length,
        });
      }
    } catch (err) {
      // Drop the batch and move on. Tracing must never wedge the daemon.
      // Classify the failure: network-level errors (sleep, brief offline,
      // tunnel flap) get logged at debug since they're transient and
      // self-recover; everything else stays at warn so genuine bugs and
      // misconfigurations are visible.
      const meta = {
        traces: traces.length,
        spans: spans.length,
        logs: logs.length,
      };
      if (isNetworkOfflineError(err)) {
        Logger.debug("trace-forwarder: flush skipped (offline)", {
          ...meta,
          error: err instanceof Error ? err.message : String(err),
        });
      } else {
        Logger.warn("trace-forwarder: flush failed", err, meta);
      }
    }
  }
}
