import type postgres from "postgres";
import type { Span } from "./context.ts";

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

const MAX_BODY_BYTES = 256 * 1024;

export class TraceStore {
  private sql: postgres.Sql;
  private flushIntervalMs: number;
  private maxBatchSize: number;
  private scrub: Scrubber;
  private timer: ReturnType<typeof setInterval> | null = null;

  private traceBuffer: TraceRecord[] = [];
  private spanBuffer: SpanRecord[] = [];
  private logBuffer: LogRecord[] = [];

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
    await this.flush();
  }

  pushTrace(t: TraceRecord): void {
    this.traceBuffer.push(t);
    this.maybeFlushOverflow();
  }

  pushSpan(s: SpanRecord): void {
    this.spanBuffer.push({
      ...s,
      input: this.scrub(s.input),
      output: this.scrub(s.output),
    });
    this.maybeFlushOverflow();
  }

  pushLog(l: LogRecord): void {
    this.logBuffer.push(l);
    this.maybeFlushOverflow();
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
        `[mneme/core] trace flush failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }
}

let _store: TraceStore | undefined;

export function configureTraceStore(store: TraceStore): void {
  _store = store;
  store.start();
}

export function getTraceStore(): TraceStore | undefined {
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
