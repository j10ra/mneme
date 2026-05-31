// Server-side query embedding for connector clients (#59 follow-up).
//
// Plugin callers substitute embed('text') locally via the daemon before
// the SQL reaches /mcp, so they never touch this. A bare connector (no
// daemon) sends embed('text') through; when MNEME_SERVER_EMBED=1 the
// server resolves it here with the same bge-small model (@mneme/embed),
// baked into the image at <cwd>/.embed-cache so the first call never
// downloads at runtime.

import { join } from "node:path";
import { env } from "../infra/env.ts";

export function serverEmbedEnabled(): boolean {
  return env.SERVER_EMBED_ENABLED;
}

let cacheDirSet = false;

/** Embed query text → 384-dim vectors using the baked-in model. Lazily
 *  imports @mneme/embed so the model only loads when a connector actually
 *  runs a semantic query. */
export async function embedQuery(texts: string[]): Promise<number[][]> {
  if (!cacheDirSet) {
    process.env.MNEME_EMBED_CACHE_DIR ??= join(process.cwd(), ".embed-cache");
    cacheDirSet = true;
  }

  const { embed } = await import("@mneme/embed");

  return embed(texts);
}
