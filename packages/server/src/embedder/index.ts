// Embedder re-exports. The canonical embedder lives in each per-machine
// daemon (bge-small subprocess, see packages/daemon/src/embed-worker.ts).
// This module is the server-side fallback path used only by callers that
// bypass the daemon's MCP proxy.
//
// Switching to a different-dim provider requires a `vector(N)` migration
// on the memories.embedding column AND a re-embed pass for existing rows
// (see migrations/0022_embedder_bge_small.sql + the reembed.ts script
// for the pattern).

export {
  EMBEDDER_DIM,
  EMBEDDER_MODEL,
  embedBatch,
  embedText,
} from "./local.ts";
