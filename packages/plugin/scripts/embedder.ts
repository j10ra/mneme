// Plugin-side embedder helpers.
//
// EMBEDDER_MODEL mirrors the daemon's constant in packages/daemon/src/
// embed.ts. Plugin scripts run on the user's machine alongside the
// daemon; when they post direct-write memories to the server they need
// to stamp the same embedder identity the daemon would have stamped, so
// chunk_ids hash consistently against daemon-pushed bundles. The server
// is label-agnostic — it stores whatever this string is — so the only
// invariant is that this matches the daemon. Plugin + daemon ship
// version-locked, so the duplicate is safe; the daemon is the source
// of truth and this file mirrors it.
//
// embedViaDaemon() calls the local daemon's /embed endpoint to embed
// content at write time, so direct-write memories (handoff, pin <text>,
// compact auto-capture) land semantically searchable instead of with
// embedding=NULL. On failure (daemon down, embedder unavailable, network
// blip) the helper returns null and the caller writes the row without a
// vector — the row is still keyword-searchable via tsv, just absent from
// semantic recall until something else embeds it.

export const EMBEDDER_MODEL = "BAAI/bge-small-en-v1.5";

/** Fetch a single-text embedding from the local daemon. Returns null on
 *  any failure; the caller writes the row without an embedding in that
 *  case (acceptable degradation — row stays keyword-searchable). */
export async function embedViaDaemon(daemonPort: number, text: string): Promise<number[] | null> {
  try {
    const resp = await fetch(`http://127.0.0.1:${daemonPort}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [text] }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return null;
    const body = (await resp.json()) as { vectors?: number[][] };
    if (!Array.isArray(body.vectors) || body.vectors.length !== 1) return null;
    const vec = body.vectors[0];
    return Array.isArray(vec) && vec.length > 0 ? vec : null;
  } catch {
    return null;
  }
}
