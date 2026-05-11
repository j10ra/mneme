// Subprocess-backed embedder.
//
// Lifts the bge-large ONNX session out of the daemon process into a
// child (`embed-worker.ts`). The daemon's own RSS stays at ~100MB
// baseline; the embedder process only exists while embedding work is
// happening, and on idle disposal the OS reclaims everything (no
// MALLOC_LARGE fragmentation, see #33).
//
// Public surface is unchanged from the in-process version: callers
// see `embedBatch(texts) -> Promise<number[][]>` and the daemon's
// scheduler still calls `disposeIfIdle()` on a tick.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Logger } from "@mneme/core";

// Canonical model name written into `meta.embedding_model` and used in
// `chunk_id = sha256(content_hash + ":" + EMBEDDER_MODEL)`. The
// Transformers.js mirror ID (`Xenova/bge-small-en-v1.5`) is an
// implementation detail of the worker. Phase 1 of #36 swapped from
// bge-large (1024-dim) to bge-small (384-dim): retrieval-tier MTEB
// score is higher, on-disk ONNX shrinks ~3x, peak RAM ~5x.
export const EMBEDDER_MODEL = "BAAI/bge-small-en-v1.5";
export const EMBEDDER_DIM = 384;

// Idle window after which `disposeIfIdle()` will kill the worker. Cold
// start on the next embed is ~1-2s (model load); same idle threshold
// the in-process version used so behaviour stays unchanged.
const PIPELINE_IDLE_MS = 60 * 1000;

// How long to wait after closing stdin before SIGTERM. The worker
// should exit promptly on EOF; this is the safety net.
const DISPOSE_GRACE_MS = 2000;

type Pending = {
  texts: string[];
  resolve: (v: number[][]) => void;
  reject: (e: Error) => void;
};

type ChildHandle = {
  proc: ReturnType<typeof Bun.spawn>;
  // Bun.spawn(stdin: "pipe") returns a FileSink, not a web WritableStream.
  // It has synchronous .write() / .end() and an async .flush(). Keep
  // the type loose to avoid leaking Bun internals into the public file.
  stdin: { write(data: Uint8Array): number; end(): void; flush(): void | Promise<number> };
};

let child: ChildHandle | null = null;
let readLoop: Promise<void> | null = null;
let inflight: Pending | null = null;
const queue: Pending[] = [];
let lastUsedAt = 0;

function workerScriptPath(): string {
  // Production install: daemon-install.ts sets MNEME_PLUGIN_ROOT to
  // <plugin-root>, where build-plugin.ts deposits embed-worker.js
  // alongside daemon.js.
  const fromEnv = process.env.MNEME_PLUGIN_ROOT;
  if (fromEnv && fromEnv.trim()) {
    const p = join(fromEnv.trim(), "embed-worker.js");
    if (existsSync(p)) return p;
  }
  // Dev / fallback resolution: walk known relative shapes from this
  // module's URL. Mirrors routes/dashboard.ts.
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    // bundled: <plugin-root>/daemon.js sibling
    join(here, "embed-worker.js"),
    // dev: packages/daemon/src/embed.ts → embed-worker.ts in same dir
    join(here, "embed-worker.ts"),
    // dev from workspace root
    join(here, "..", "..", "..", "packages", "plugin", "embed-worker.js"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `embed-worker not found. Checked MNEME_PLUGIN_ROOT and ${candidates.join(", ")}`,
  );
}

function failPending(err: Error): void {
  if (inflight) {
    inflight.reject(err);
    inflight = null;
  }
  while (queue.length > 0) queue.shift()!.reject(err);
}

async function ensureChild(): Promise<ChildHandle> {
  if (child && child.proc.exitCode === null) return child;
  const script = workerScriptPath();
  // Use the same Bun binary that's running the daemon. launchd / systemd
  // unit files only put a minimal PATH on the env, so plain "bun" won't
  // resolve; `process.execPath` is bulletproof.
  const bunBin = process.execPath;
  Logger.info("embedder: spawning worker", { script, bun: bunBin });
  const proc = Bun.spawn([bunBin, script], {
    stdin: "pipe",
    stdout: "pipe",
    // stderr inherits so transformers.js load logs land in the daemon's
    // stderr stream alongside the rest of the daemon's logs.
    stderr: "inherit",
    env: process.env as Record<string, string>,
  });
  if (!proc.stdin || !proc.stdout) {
    throw new Error("embed-worker spawn did not return stdio pipes");
  }
  const handle: ChildHandle = {
    proc,
    stdin: proc.stdin as unknown as ChildHandle["stdin"],
  };
  child = handle;

  readLoop = readStdoutLoop(handle).catch((err) => {
    Logger.warn("embedder: read loop crashed", {
      err: err instanceof Error ? err.message : String(err),
    });
  });

  // If the worker exits unexpectedly, fail any in-flight + queued
  // requests so callers see a clear error instead of hanging forever.
  void proc.exited.then((code) => {
    if (child === handle) child = null;
    if (code !== 0 && code !== null) {
      Logger.warn("embed-worker exited unexpectedly", { code });
      failPending(new Error(`embed-worker exited (code=${code})`));
    }
  });

  return handle;
}

async function readStdoutLoop(handle: ChildHandle): Promise<void> {
  const reader = (
    handle.proc.stdout as ReadableStream<Uint8Array>
  ).getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const handler = inflight;
      inflight = null;
      if (!handler) {
        Logger.warn("embedder: stray response from worker", {
          preview: line.slice(0, 200),
        });
        continue;
      }
      try {
        const resp = JSON.parse(line) as {
          vectors?: number[][];
          error?: string;
        };
        if (resp.error) handler.reject(new Error(resp.error));
        else if (resp.vectors) handler.resolve(resp.vectors);
        else handler.reject(new Error("invalid embed-worker response"));
      } catch (err) {
        handler.reject(err as Error);
      }
      pumpQueue();
    }
  }
}

function pumpQueue(): void {
  if (inflight || queue.length === 0 || !child) return;
  const next = queue.shift()!;
  inflight = next;
  const line = JSON.stringify({ texts: next.texts }) + "\n";
  const enc = new TextEncoder();
  try {
    child.stdin.write(enc.encode(line));
    // FileSink buffers writes; flush so the worker actually receives
    // the request without waiting for more data.
    void child.stdin.flush();
  } catch (err) {
    if (inflight === next) inflight = null;
    next.reject(err instanceof Error ? err : new Error(String(err)));
    return;
  }
  lastUsedAt = Date.now();
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  await ensureChild();
  return new Promise<number[][]>((resolve, reject) => {
    queue.push({ texts, resolve, reject });
    pumpQueue();
  });
}

export async function disposeIfIdle(
  idleMs: number = PIPELINE_IDLE_MS,
): Promise<boolean> {
  if (!child) return false;
  if (inflight || queue.length > 0) return false;
  if (Date.now() - lastUsedAt < idleMs) return false;

  Logger.info("embedder: disposing idle worker", {
    idle_seconds: Math.round((Date.now() - lastUsedAt) / 1000),
  });

  const handle = child;
  child = null;

  // Closing stdin signals the worker's `for await (chunk of stdin)`
  // loop to terminate and the worker exits with code 0. SIGTERM is
  // the safety net if it doesn't honor that quickly.
  try {
    handle.stdin.end();
  } catch (err) {
    Logger.warn("embedder: stdin end threw", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  const timeout = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), DISPOSE_GRACE_MS),
  );
  const winner = await Promise.race([handle.proc.exited, timeout]);
  if (winner === "timeout") {
    Logger.warn("embed-worker did not exit on stdin close, sending SIGTERM");
    handle.proc.kill();
    await handle.proc.exited;
  }
  // Allow the read loop to wind down (reader will see done=true).
  if (readLoop) {
    await readLoop.catch(() => {});
    readLoop = null;
  }
  return true;
}
