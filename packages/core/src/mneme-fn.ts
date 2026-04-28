import { newId, storage, type Span } from "./context.ts";
import { getTraceStore, summarizeIO } from "./trace-store.ts";

/**
 * Wraps an async function with a child span. Inherits the active TraceContext
 * via AsyncLocalStorage. If called outside any trace, runs the function
 * directly (no fabricated trace).
 */
export function mnemeFn<TArgs extends unknown[], TReturn>(
  name: string,
  fn: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const ctx = storage.getStore();
    if (!ctx) return fn(...args);

    const span: Span = {
      spanId: newId(),
      parentSpanId: ctx.spanStack.at(-1)?.spanId,
      name,
      startedAtMs: Date.now(),
    };

    ctx.spanStack.push(span);

    let errorMessage: string | undefined;
    try {
      const result = await fn(...args);
      const summary = summarizeIO(result);
      span.output = summary.value;
      span.outputSize = summary.size;
      return result;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      span.durationMs = Date.now() - span.startedAtMs;
      span.errorMessage = errorMessage;
      ctx.spanStack.pop();

      const store = getTraceStore();
      if (store) {
        store.pushSpan({ ...span, traceId: ctx.traceId });
      }
    }
  };
}
