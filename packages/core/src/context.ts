import { AsyncLocalStorage } from "node:async_hooks";

export type Span = {
  spanId: string;
  parentSpanId?: string;
  name: string;
  startedAtMs: number;
  durationMs?: number;
  errorMessage?: string;
  inputSize?: number;
  outputSize?: number;
  input?: unknown;
  output?: unknown;
};

export type AuthContext = {
  keyId: string;
  name: string;
  machineId: string | null;
  scopes: string[];
};

export type TraceContext = {
  traceId: string;
  source: string;
  spanStack: Span[];
  auth?: AuthContext;
};

export const storage = new AsyncLocalStorage<TraceContext>();

export function currentTrace(): TraceContext | undefined {
  return storage.getStore();
}

export function currentSpan(): Span | undefined {
  return storage.getStore()?.spanStack.at(-1);
}

export function currentAuth(): AuthContext | undefined {
  return storage.getStore()?.auth;
}

export function newId(): string {
  return crypto.randomUUID();
}
