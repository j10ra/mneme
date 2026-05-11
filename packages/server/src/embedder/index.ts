// Embedder provider selector. Mneme is embedder-agnostic: any implementation
// exporting `embedBatch`, `embedText`, `EMBEDDER_MODEL`, and `EMBEDDER_DIM`
// can be plugged in here. Today only "local" (homelab TEI) is wired — adding
// a new provider (Voyage cloud, OpenAI text-embedding-*, etc.) is one new
// file under embedder/ + one entry below.
//
// Current canonical embedder is BAAI/bge-small-en-v1.5 (384-dim). Switching
// to a different-dim provider requires a `vector(N)` migration on the
// memories.embedding column AND a re-embed pass for existing rows (see
// migrations/0022_embedder_bge_small.sql + packages/daemon/scripts/reembed.ts
// for the pattern).

import { env } from "../infra/env.ts";
import * as local from "./local.ts";

const PROVIDERS = {
  local,
} as const;

type ProviderName = keyof typeof PROVIDERS;

const PROVIDER_NAME = env.EMBEDDER_PROVIDER as ProviderName;

if (!(PROVIDER_NAME in PROVIDERS)) {
  throw new Error(
    `Unknown EMBEDDER_PROVIDER: ${PROVIDER_NAME}. Available: ${Object.keys(PROVIDERS).join(", ")}`,
  );
}

const provider = PROVIDERS[PROVIDER_NAME];

export const embedText = provider.embedText;
export const embedBatch = provider.embedBatch;
export const EMBEDDER_MODEL = provider.EMBEDDER_MODEL;
export const EMBEDDER_DIM = provider.EMBEDDER_DIM;
