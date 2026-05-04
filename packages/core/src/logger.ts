import { storage } from "./context.ts";
import { getTraceStore } from "./trace-store.ts";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let jsonMode = false;
let minLevel: Level = "debug";

export function configureLogger(opts: {
  jsonMode?: boolean;
  minLevel?: Level;
}): void {
  if (opts.jsonMode !== undefined) jsonMode = opts.jsonMode;
  if (opts.minLevel !== undefined) minLevel = opts.minLevel;
}

function emit(level: Level, message: string, error?: unknown): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[minLevel]) return;

  const ctx = storage.getStore();
  const traceId = ctx?.traceId;
  const spanId = ctx?.spanStack.at(-1)?.spanId;
  const ts = Date.now();

  const errStr =
    error instanceof Error
      ? error.message
      : error !== undefined
        ? String(error)
        : undefined;

  // Buffer to DB store (only if traceId; orphan logs go to stderr only)
  const store = getTraceStore();
  if (store) {
    const fullMessage = errStr ? `${message} :: ${errStr}` : message;
    store.pushLog({ traceId, spanId, level, message: fullMessage, ts });
  }

  // INFO/DEBUG → stdout, WARN/ERROR → stderr. Lets Railway/Docker/k8s log
  // viewers colorize by severity correctly. (Earlier this was all-stderr,
  // which made every INFO line render red on Railway.)
  const stream = level === "warn" || level === "error" ? process.stderr : process.stdout;
  if (jsonMode) {
    const record: Record<string, unknown> = {
      ts: new Date(ts).toISOString(),
      level: level.toUpperCase(),
      message,
      traceId,
      spanId,
    };
    if (error instanceof Error) {
      record.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error !== undefined) {
      record.error = String(error);
    }
    stream.write(`${JSON.stringify(record)}\n`);
  } else {
    const t = new Date(ts).toISOString().slice(11, 23);
    const lvlPad = level.toUpperCase().padEnd(5);
    const tracePart = traceId ? `[${traceId.slice(0, 8)}] ` : "";
    const errPart = errStr ? ` :: ${errStr}` : "";
    stream.write(`${t} ${lvlPad} ${tracePart}${message}${errPart}\n`);
    // For ERROR with a real Error, print the stack on continuation lines so
    // local debugging gets the call site without flipping to JSON mode.
    if (level === "error" && error instanceof Error && error.stack) {
      const stackLines = error.stack
        .split("\n")
        .slice(1) // drop the duplicate "Error: message" header
        .map((l) => `    ${l.trim()}`)
        .join("\n");
      if (stackLines) stream.write(`${stackLines}\n`);
    }
  }
}

export const Logger = {
  debug: (msg: string): void => emit("debug", msg),
  info: (msg: string): void => emit("info", msg),
  warn: (msg: string, err?: unknown): void => emit("warn", msg, err),
  error: (msg: string, err?: unknown): void => emit("error", msg, err),
};
