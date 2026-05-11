// Helper for code paths that aren't kicked off by an HTTP request and
// therefore have no mnemeRoute middleware to seed a TraceContext for
// them — daemon stage ticks (capture/embed/push) and the scheduler's
// time-driven jobs (dream, heartbeat, embedder-reap).
//
// Starts a fresh TraceContext, runs `fn` inside it, and only flushes
// the trace if at least one child span recorded actual work. This
// keeps no-op ticks (every 2s when the outbox is empty) from hammering
// the trace pipeline.

import { Logger, errorMessageOf, getTraceStore, newId, storage } from "@mneme/core";
import type { Span, TraceContext } from "@mneme/core";

export async function withRootTrace<T>(
  name: string,
  source: string,
  fn: () => Promise<T>,
): Promise<T> {
  const traceId = newId();
  const spanId = newId();
  const startedAtMs = Date.now();
  const rootSpan: Span = { spanId, name, startedAtMs };
  const ctx: TraceContext = {
    traceId,
    source,
    spanStack: [rootSpan],
  };

  let errorMessage: string | undefined;
  let result: T | undefined;
  try {
    result = await storage.run(ctx, fn);
    return result;
  } catch (err) {
    errorMessage = errorMessageOf(err);
    throw err;
  } finally {
    const endedAtMs = Date.now();
    const durationMs = endedAtMs - startedAtMs;
    rootSpan.durationMs = durationMs;
    rootSpan.errorMessage = errorMessage;

    const store = getTraceStore();
    if (store && (store.hasChildSpans(traceId) || errorMessage)) {
      store.pushSpan({ ...rootSpan, traceId });
      store.pushTrace({
        traceId,
        rootSpanName: name,
        source,
        startedAtMs,
        endedAtMs,
        durationMs,
      });
    }

    if (errorMessage) {
      Logger.warn(`${name} failed`, errorMessage, { durationMs });
    }
  }
}
