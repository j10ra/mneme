import { Logger } from "@mneme/core";
import { runEmbedOnce, type EmbedResult } from "./embed.ts";
import { runExtractOnce, type ExtractResult } from "./extract.ts";
import { startKeepalive } from "./keepalive.ts";
import { startNap } from "./nap.ts";

const EXTRACT_INTERVAL_MS = 10_000;
const EMBED_INTERVAL_MS = 5_000;

type Result = ExtractResult | EmbedResult;

// Singleton state pinned to globalThis so `bun --hot` reloads can find a
// previous instance and signal it to exit. Without this, every code edit
// spawns a fresh worker loop while the old ones keep ticking, multiplying
// API calls (the 18+31-jobs-rate-limited bug). The shared state object is
// mutated in place — old closures hold the same reference, so flipping
// `state.stopped = true` cleanly exits any prior loop on its next tick.
const SINGLETON_KEY = Symbol.for("mneme.worker.singleton");
type SingletonState = {
  stopped: boolean;
  extractTimer: ReturnType<typeof setTimeout> | null;
  embedTimer: ReturnType<typeof setTimeout> | null;
};

const g = globalThis as unknown as { [key: symbol]: SingletonState | undefined };

if (g[SINGLETON_KEY]) {
  g[SINGLETON_KEY].stopped = true;
  if (g[SINGLETON_KEY].extractTimer) clearTimeout(g[SINGLETON_KEY].extractTimer);
  if (g[SINGLETON_KEY].embedTimer) clearTimeout(g[SINGLETON_KEY].embedTimer);
  Logger.info("worker: prior instance detected, signaled stop");
}

const state: SingletonState = {
  stopped: false,
  extractTimer: null,
  embedTimer: null,
};
g[SINGLETON_KEY] = state;

async function loop(
  name: "extract" | "embed",
  run: () => Promise<Result>,
  intervalMs: number,
): Promise<void> {
  while (!state.stopped) {
    let result: Result = { didWork: false };
    try {
      result = await run();
    } catch (e) {
      Logger.error(`worker.${name} crashed`, e);
    }
    if (state.stopped) break;
    if (result.didWork && !result.pauseMs) continue; // drain queue back-to-back
    const sleepMs = result.pauseMs ?? intervalMs;
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, sleepMs);
      if (name === "extract") state.extractTimer = t;
      else state.embedTimer = t;
    });
  }
  Logger.info(`worker.${name}: loop exited`);
}

/** Start the extract+embed worker loops. Non-blocking; runs until stopWorker(). */
export function startWorker(): void {
  Logger.info("worker: starting extract + embed loops");
  void loop("extract", runExtractOnce, EXTRACT_INTERVAL_MS);
  void loop("embed", runEmbedOnce, EMBED_INTERVAL_MS);
  startKeepalive();
  startNap();
}

/** Signal both loops to stop and clear pending timers. */
export async function stopWorker(): Promise<void> {
  state.stopped = true;
  if (state.extractTimer) clearTimeout(state.extractTimer);
  if (state.embedTimer) clearTimeout(state.embedTimer);
  Logger.info("worker: stop requested");
}
