import type { MiddlewareHandler } from "hono";
import { newId, storage, type Span, type TraceContext } from "./context.ts";
import {
  getTraceStore,
  summarizeIO,
  MAX_BODY_BYTES_EXPORT as MAX_BODY_BYTES,
} from "./trace-store.ts";

/**
 * Hono middleware. Starts a root span for each request, captures source from
 * x-mneme-source header, captures request/response JSON (capped at 256KB),
 * propagates TraceContext via AsyncLocalStorage.
 */
export function lensRoute(name: string): MiddlewareHandler {
  return async (c, next) => {
    const traceId = newId();
    const spanId = newId();
    const startedAtMs = Date.now();
    const source = c.req.header("x-mneme-source") ?? "http";

    // Capture request body for POST/PUT/PATCH JSON via clone (doesn't consume
    // the original stream — handler can still read c.req.json()).
    let inputObj: unknown;
    let inputSize: number | undefined;
    const method = c.req.method;
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const ct = c.req.header("content-type") ?? "";
      if (ct.includes("application/json")) {
        try {
          const cloned = c.req.raw.clone();
          const text = await cloned.text();
          inputSize = text.length;
          if (inputSize <= MAX_BODY_BYTES) {
            inputObj = JSON.parse(text);
          } else {
            inputObj = { _truncated: true, size: inputSize };
          }
        } catch {
          inputObj = { _unparseable: true };
        }
      }
    }

    const rootSpan: Span = {
      spanId,
      name,
      startedAtMs,
      input: inputObj,
      inputSize,
    };

    const ctx: TraceContext = {
      traceId,
      source,
      spanStack: [rootSpan],
    };

    let errorMessage: string | undefined;

    try {
      await storage.run(ctx, async () => {
        await next();
      });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      // Capture response body
      let outputObj: unknown;
      let outputSize: number | undefined;
      try {
        const respCt = c.res.headers.get("content-type") ?? "";
        if (respCt.includes("application/json")) {
          const cloned = c.res.clone();
          const text = await cloned.text();
          const summary = summarizeIO(text ? JSON.parse(text) : null);
          outputObj = summary.value;
          outputSize = summary.size;
        }
      } catch {
        outputObj = { _unparseable_response: true };
      }

      const endedAtMs = Date.now();
      const durationMs = endedAtMs - startedAtMs;

      rootSpan.durationMs = durationMs;
      rootSpan.errorMessage = errorMessage;
      rootSpan.output = outputObj;
      rootSpan.outputSize = outputSize;

      const store = getTraceStore();
      if (store) {
        store.pushTrace({
          traceId,
          rootSpanName: name,
          source,
          startedAtMs,
          endedAtMs,
          durationMs,
        });
        store.pushSpan({ ...rootSpan, traceId });
      }
    }
  };
}
