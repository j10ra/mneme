// Server-side query embedding for connector clients (#59 follow-up).
//
// Plugin callers substitute embed('text') locally via the daemon before
// the SQL reaches /mcp, so they never touch this. A bare connector (no
// daemon) sends embed('text') through; when MNEME_SERVER_EMBED=1 the
// server resolves it here with the same bge-small model (@mneme/embed),
// baked into the image at <cwd>/.embed-cache so the first call never
// downloads at runtime.

import { join } from "node:path";
import { Logger } from "@mneme/core";
import { env } from "../infra/env.ts";

export function serverEmbedEnabled(): boolean {
  return env.SERVER_EMBED_ENABLED;
}

let cacheDirSet = false;
let warmed = false;

/** Embed query text → 384-dim vectors using the baked-in model. Lazily
 *  imports @mneme/embed so the model only loads when a connector actually
 *  runs a semantic query. Each call logs to stdout (Railway-visible): the
 *  first one is a cold load (~1-2s); subsequent calls are warm. */
export async function embedQuery(texts: string[]): Promise<number[][]> {
  if (!cacheDirSet) {
    process.env.MNEME_EMBED_CACHE_DIR ??= join(process.cwd(), ".embed-cache");
    cacheDirSet = true;
  }

  const { embed } = await import("@mneme/embed");
  const cold = !warmed;

  if (cold)
    Logger.info("mcp.embed: loading server embedder (cold start, connector semantic query)");

  const t0 = Date.now();
  const vectors = await embed(texts);

  warmed = true;
  Logger.info("mcp.embed: resolved embed() server-side", {
    texts: texts.length,
    ms: Date.now() - t0,
    cold,
  });

  return vectors;
}
