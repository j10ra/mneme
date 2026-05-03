import { Logger } from "@mneme/core";
import { runEmbedOnce, type EmbedResult } from "./embed.ts";
import { runExtractOnce, type ExtractResult } from "./extract.ts";

const EXTRACT_INTERVAL_MS = 10_000;
const EMBED_INTERVAL_MS = 5_000;

type Result = ExtractResult | EmbedResult;

let stopped = false;
let extractTimer: ReturnType<typeof setTimeout> | null = null;
let embedTimer: ReturnType<typeof setTimeout> | null = null;

async function loop(
  name: string,
  run: () => Promise<Result>,
  intervalMs: number,
): Promise<void> {
  while (!stopped) {
    let result: Result = { didWork: false };
    try {
      result = await run();
    } catch (e) {
      Logger.error(`worker.${name} crashed`, e);
    }
    if (stopped) break;
    if (result.didWork && !result.pauseMs) continue; // drain queue back-to-back
    const sleepMs = result.pauseMs ?? intervalMs;
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, sleepMs);
      if (name === "extract") extractTimer = t;
      else embedTimer = t;
    });
  }
}

/** Start the extract+embed worker loops. Non-blocking; runs until stopWorker(). */
export function startWorker(): void {
  Logger.info("worker: starting extract + embed loops");
  void loop("extract", runExtractOnce, EXTRACT_INTERVAL_MS);
  void loop("embed", runEmbedOnce, EMBED_INTERVAL_MS);
}

/** Signal both loops to stop and clear pending timers. Resolves when next tick runs. */
export async function stopWorker(): Promise<void> {
  stopped = true;
  if (extractTimer) clearTimeout(extractTimer);
  if (embedTimer) clearTimeout(embedTimer);
  Logger.info("worker: stop requested");
}
