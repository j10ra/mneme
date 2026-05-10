import type postgres from "postgres";
import type { Span } from "./context.ts";
import { errorMessageOf } from "./errors.ts";

export type TraceRecord = {
  traceId: string;
  rootSpanName: string;
  source: string;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
};

export type SpanRecord = Span & { traceId: string };

export type LogRecord = {
  traceId?: string;
  spanId?: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  ts: number;
};

export type Scrubber = (data: unknown) => unknown;

const identity: Scrubber = (data) => data;

// Structural contract that mnemeRoute / mnemeFn rely on. The server
// runs a TraceStore (writes to _ops directly); the daemon runs a
// TraceForwarder (POSTs to /api/ingest/spans). configureTraceStore
// accepts either.
export interface TraceSink {
  start(): void;
  stop(): Promise<void>;
  pushTrace(t: TraceRecord): void;
  pushSpan(s: SpanRecord): void;
  pushLog(l: LogRecord): void;
  flush(): Promise<void>;
}

const MAX_BODY_BYTES = 256 * 1024;

// Bound the in-flight buffers so a runaway producer (or a trace whose root
// span never ends, e.g. crash before pushTrace) can't grow memory unbounded.
// When a bucket exceeds this, oldest entries are dropped with a stderr
// warning. Realistic ceilings for a personal tool; raise if needed.
const MAX_PENDING_SPANS_PER_TRACE = 1000;
const MAX_PENDING_TRACES = 200;

// LRU of recently-finalized trace_ids. A late span or log for a trace that
// already pushed (e.g., a fire-and-forget async task that escapes the route's
// finally) goes straight to the flush buffer instead of creating a fresh
// pending bucket that would never finalize. The trace row is already in
// _ops.traces, so the FK is satisfied.
const RECENT_TRACE_LRU_SIZE = 1024;

export class TraceStore {
  private sql: postgres.Sql;
  private flushIntervalMs: number;
  private maxBatchSize: number;
  private scrub: Scrubber;
  private timer: ReturnType<typeof setInterval> | null = null;

  // Flush-ready buffers: only these get drained by flush().
  private traceBuffer: TraceRecord[] = [];
  private spanBuffer: SpanRecord[] = [];
  private logBuffer: LogRecord[] = [];

  // Pending buffers, keyed by traceId. Spans and trace-attributed logs land
  // here until their trace finalizes (pushTrace). This guarantees that the
  // _ops.traces row exists in the same tx as anything that FKs to it, so
  // _ops.spans (and _ops.logs since 0008) don't violate the FK on insert.
  private pendingSpans = new Map<string, SpanRecord[]>();
  private pendingLogs = new Map<string, LogRecord[]>();
  // LRU of trace_ids that have already been pushTrace'd. Map insertion order
  // is the LRU; oldest entry evicted when size > RECENT_TRACE_LRU_SIZE.
  private recentlyFinalized = new Map<string, true>();

  constructor(opts: {
    sql: postgres.Sql;
    flushIntervalMs?: number;
    maxBatchSize?: number;
    scrubber?: Scrubber;
  }) {
    this.sql = opts.sql;
    this.flushIntervalMs = opts.flushIntervalMs ?? 100;
    this.maxBatchSize = opts.maxBatchSize ?? 1000;
    this.scrub = opts.scrubber ?? identity;
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
    // Drop in-flight pending entries: their trace never finalized, so they'd
    // FK-violate if forced through. Surface the count for visibility.
    const orphanedSpans = [...this.pendingSpans.values()].reduce(
      (n, list) => n + list.length,
      0,
    );
    const orphanedLogs = [...this.pendingLogs.values()].reduce(
      (n, list) => n + list.length,
      0,
    );
    if (orphanedSpans > 0 || orphanedLogs > 0) {
      process.stderr.write(
        `[mneme/core] trace store stop: dropped ${orphanedSpans} pending span(s) and ${orphanedLogs} pending log(s) from in-flight traces\n`,
      );
    }
    this.pendingSpans.clear();
    this.pendingLogs.clear();
    await this.flush();
  }

  pushTrace(t: TraceRecord): void {
    // Move any spans + trace-attributed logs accumulated for this trace into
    // the flush-ready buffers alongside the trace itself. flush() will then
    // insert all three in one tx, in the right order.
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
    const scrubbed: SpanRecord = {
      ...s,
      input: this.scrub(s.input),
      output: this.scrub(s.output),
    };
    // Late span for an already-finalized trace: skip the pending bucket.
    // Trace row is already in flight, FK will be satisfied. Without this,
    // any escaping async task (or a route that pushes its rootSpan after
    // pushTrace) creates a permanent orphan bucket.
    if (this.recentlyFinalized.has(s.traceId)) {
      this.spanBuffer.push(scrubbed);
      this.maybeFlushOverflow();
      return;
    }
    let bucket = this.pendingSpans.get(s.traceId);
    if (!bucket) {
      // Cap concurrent in-flight traces. Drop the oldest bucket if exceeded.
      if (this.pendingSpans.size >= MAX_PENDING_TRACES) {
        const firstKey = this.pendingSpans.keys().next().value as string | undefined;
        if (firstKey !== undefined) {
          const dropped = this.pendingSpans.get(firstKey)?.length ?? 0;
          this.pendingSpans.delete(firstKey);
          process.stderr.write(
            `[mneme/core] trace store: dropped ${dropped} pending span(s) for stale trace ${firstKey} (MAX_PENDING_TRACES exceeded)\n`,
          );
        }
      }
      bucket = [];
      this.pendingSpans.set(s.traceId, bucket);
    }
    if (bucket.length >= MAX_PENDING_SPANS_PER_TRACE) {
      // Trace producing too many spans without finalizing. Drop oldest in the
      // bucket — keep recent activity, lose ancient context.
      bucket.shift();
    }
    bucket.push(scrubbed);
    this.maybeFlushOverflow();
  }

  pushLog(l: LogRecord): void {
    // Untraced logs flush immediately (no FK to satisfy). Trace-attributed
    // logs go into the per-trace pending bucket — unless the trace already
    // finalized, in which case they bypass pending and go straight to flush.
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
        const firstKey = this.pendingLogs.keys().next().value as string | undefined;
        if (firstKey !== undefined) {
          const dropped = this.pendingLogs.get(firstKey)?.length ?? 0;
          this.pendingLogs.delete(firstKey);
          process.stderr.write(
            `[mneme/core] trace store: dropped ${dropped} pending log(s) for stale trace ${firstKey} (MAX_PENDING_TRACES exceeded)\n`,
          );
        }
      }
      bucket = [];
      this.pendingLogs.set(l.traceId, bucket);
    }
    if (bucket.length >= MAX_PENDING_SPANS_PER_TRACE) {
      bucket.shift();
    }
    bucket.push(l);
    this.maybeFlushOverflow();
  }

  /** Record traceId as finalized; evict oldest if LRU full. Map insertion
   *  order is iteration order, so .keys().next() gives the oldest. */
  private markFinalized(traceId: string): void {
    // Move-to-end on re-insert (defensive — pushTrace shouldn't fire twice).
    if (this.recentlyFinalized.has(traceId)) {
      this.recentlyFinalized.delete(traceId);
    }
    this.recentlyFinalized.set(traceId, true);
    if (this.recentlyFinalized.size > RECENT_TRACE_LRU_SIZE) {
      const oldest = this.recentlyFinalized.keys().next().value as string | undefined;
      if (oldest !== undefined) this.recentlyFinalized.delete(oldest);
    }
  }

  private maybeFlushOverflow(): void {
    const total =
      this.traceBuffer.length + this.spanBuffer.length + this.logBuffer.length;
    if (total >= this.maxBatchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    const traces = this.traceBuffer.splice(0);
    const spans = this.spanBuffer.splice(0);
    const logs = this.logBuffer.splice(0);

    if (traces.length === 0 && spans.length === 0 && logs.length === 0) return;

    try {
      await this.sql.begin(async (sql) => {
        if (traces.length > 0) {
          await sql`
            INSERT INTO _ops.traces ${sql(
              traces.map((t) => ({
                trace_id: t.traceId,
                root_span_name: t.rootSpanName,
                source: t.source,
                started_at: new Date(t.startedAtMs),
                ended_at: new Date(t.endedAtMs),
                duration_ms: t.durationMs,
              })),
            )}
          `;
        }
        if (spans.length > 0) {
          await sql`
            INSERT INTO _ops.spans ${sql(
              spans.map((s) => ({
                span_id: s.spanId,
                trace_id: s.traceId,
                parent_span_id: s.parentSpanId ?? null,
                name: s.name,
                started_at: new Date(s.startedAtMs),
                duration_ms: s.durationMs ?? null,
                error_message: s.errorMessage ?? null,
                input_size: s.inputSize ?? null,
                output_size: s.outputSize ?? null,
                input: s.input === undefined ? null : sql.json(s.input as never),
                output:
                  s.output === undefined ? null : sql.json(s.output as never),
              })),
            )}
          `;
        }
        if (logs.length > 0) {
          await sql`
            INSERT INTO _ops.logs ${sql(
              logs.map((l) => ({
                trace_id: l.traceId ?? null,
                span_id: l.spanId ?? null,
                level: l.level,
                message: l.message,
                ts: new Date(l.ts),
              })),
            )}
          `;
        }
      });
    } catch (err) {
      // Last-resort: write to stderr; drop the batch rather than infinite-retry.
      process.stderr.write(
        `[mneme/core] trace flush failed: ${errorMessageOf(err)}\n`,
      );
    }
  }
}

let _store: TraceSink | undefined;

export function configureTraceStore(store: TraceSink): void {
  _store = store;
  store.start();
}

export function getTraceStore(): TraceSink | undefined {
  return _store;
}

export function summarizeIO(data: unknown): {
  value: unknown;
  size: number;
} {
  if (data === undefined || data === null) return { value: null, size: 0 };
  try {
    const json = JSON.stringify(data);
    const size = json.length;
    if (size > MAX_BODY_BYTES) {
      return { value: { _truncated: true, size }, size };
    }
    return { value: data, size };
  } catch {
    return { value: { _unserializable: true }, size: 0 };
  }
}

export const MAX_BODY_BYTES_EXPORT = MAX_BODY_BYTES;
