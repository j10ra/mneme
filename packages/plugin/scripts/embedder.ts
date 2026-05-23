// Mirror of the daemon's EMBEDDER_MODEL constant.
//
// Plugin scripts run on the user's machine alongside the daemon. When
// they post direct-write memories to the server (slash.ts: /handoff,
// /pin <text>; hook.ts: compact auto-capture), they need to stamp the
// same embedder identity the daemon would have stamped, so chunk_ids
// hash consistently against daemon-pushed bundles.
//
// The server is label-agnostic — it stores whatever this string is —
// so the only invariant is that this matches packages/daemon/src/embed.ts:
// EMBEDDER_MODEL. The plugin and daemon ship together (version-locked),
// so the duplicate is safe; the daemon's value is the source of truth
// and this file mirrors it.

export const EMBEDDER_MODEL = "BAAI/bge-small-en-v1.5";
