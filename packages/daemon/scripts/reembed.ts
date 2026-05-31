#!/usr/bin/env bun
// One-shot re-embed script for the bge-large -> bge-small migration (#36 Phase 1).
//
// Loads bge-small locally via transformers.js, walks memories WHERE
// embedding IS NULL in batches, and UPDATEs each row with the new
// 384-dim vector + matching embedding_model + recomputed chunk_id.
// Idempotent: the WHERE filter means rerunning picks up only rows
// still needing work, so a crash or network blip is recoverable by
// re-invocation.
//
// Pre-requisite: migrations/0022 + 0023 applied (column is vector(384),
// HNSW index exists but empty). Run `bun run migrate` first.
//
// Usage:
//   DATABASE_URL=postgresql://... bun packages/daemon/scripts/reembed.ts
//
// After completion: `/plugin update mneme` + daemon restart on every
// machine so they start emitting 384-dim captures matching the column.

import { createHash } from "node:crypto";
import postgres from "postgres";

const EMBEDDER_MODEL = "BAAI/bge-small-en-v1.5";
const TRANSFORMERS_MODEL_ID = "Xenova/bge-small-en-v1.5";
const EMBEDDER_DIM = 384;
const BATCH_SIZE = 32;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 4, connect_timeout: 10 });

// Pre-flight: confirm the column is vector(384). format_type returns
// "vector(N)" for pgvector columns, which is the cleanest sanity check.
const cols = await sql<{ format_type: string }[]>`
  SELECT format_type(atttypid, atttypmod) AS format_type
  FROM pg_attribute
  WHERE attrelid = 'public.memories'::regclass
    AND attname = 'embedding'
    AND NOT attisdropped
`;
const colType = cols[0]?.format_type;

if (colType !== `vector(${EMBEDDER_DIM})`) {
  console.error(
    `memories.embedding is ${colType ?? "<missing>"}, expected vector(${EMBEDDER_DIM}). Run migration 0022 first.`,
  );
  await sql.end();
  process.exit(1);
}

const totalRow = await sql<{ c: number }[]>`
  SELECT count(*)::int AS c FROM memories WHERE embedding IS NULL
`;
const total = totalRow[0]!.c;

console.log(`memories needing re-embed: ${total}`);

if (total === 0) {
  await sql.end();
  console.log("nothing to do");
  process.exit(0);
}

console.log(`loading ${TRANSFORMERS_MODEL_ID} ...`);
const tModelLoad = Date.now();
const { pipeline, env: tfEnv } = await import("@xenova/transformers");

tfEnv.useBrowserCache = false;
tfEnv.allowLocalModels = false;
const extractor = (await pipeline("feature-extraction", TRANSFORMERS_MODEL_ID, {
  quantized: true,
} as never)) as unknown as (
  texts: string[],
  options: { pooling: "mean"; normalize: true },
) => Promise<{ tolist(): number[][] }>;

console.log(`pipeline ready (${Date.now() - tModelLoad}ms)`);

function chunkIdFor(contentHash: string): string {
  return createHash("sha256").update(`${contentHash}:${EMBEDDER_MODEL}`).digest("hex");
}

let processed = 0;
const tStart = Date.now();

while (true) {
  const rows = await sql<{ id: string; content: string; content_hash: string }[]>`
    SELECT id, content, content_hash
    FROM memories
    WHERE embedding IS NULL
    ORDER BY created_at
    LIMIT ${BATCH_SIZE}
  `;

  if (rows.length === 0) break;

  const texts = rows.map((r) => r.content);
  const out = await extractor(texts, { pooling: "mean", normalize: true });
  const vectors = out.tolist() as number[][];

  // One transaction per batch — partial failures roll back so the
  // WHERE embedding IS NULL filter still picks them up next iteration.
  await sql.begin(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const vec = `[${vectors[i]!.join(",")}]`;
      const newChunkId = chunkIdFor(row.content_hash);

      await tx`
        UPDATE memories
        SET embedding       = ${vec}::vector,
            embedding_model = ${EMBEDDER_MODEL},
            chunk_id        = ${newChunkId}
        WHERE id = ${row.id}
      `;
    }
  });

  processed += rows.length;
  const elapsedS = (Date.now() - tStart) / 1000;
  const rate = processed / elapsedS;
  const remaining = total - processed;
  const etaS = rate > 0 ? Math.ceil(remaining / rate) : 0;

  console.log(`progress: ${processed}/${total}  (${rate.toFixed(1)} rows/s, ETA ${etaS}s)`);
}

await sql.end();
console.log(
  `done in ${((Date.now() - tStart) / 1000).toFixed(1)}s.  Restart daemons + /plugin update mneme to start emitting 384-dim captures.`,
);
