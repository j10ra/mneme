#!/usr/bin/env bun
// Smoke test for embedder swaps. Loads the current daemon embedder
// locally, runs a handful of representative queries against memories
// via cosine distance, and prints top-K with similarity scores.
//
// Useful any time the embedder model changes (#36 Phase 1) or the DB
// moves regions (#36 Phase 4) and you want to eyeball whether recall
// stays sensible.
//
// Usage:
//   DATABASE_URL=postgresql://... bun packages/daemon/scripts/smoke-recall.ts

import postgres from "postgres";

const MODEL_ID = "Xenova/bge-small-en-v1.5";
const TOP_K = 5;

const queries = [
  "railway migration",
  "daemon embedder subprocess",
  "supabase free tier 500MB",
  "plugin update reload-plugins",
  "homelab-vm B4as_v2",
];

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 2, connect_timeout: 10 });

console.error(`loading ${MODEL_ID} ...`);
const tLoad = Date.now();
const { pipeline, env: tfEnv } = await import("@xenova/transformers");
tfEnv.useBrowserCache = false;
tfEnv.allowLocalModels = false;
const extractor = (await pipeline(
  "feature-extraction",
  MODEL_ID,
  { quantized: true } as never,
)) as unknown as (
  texts: string | string[],
  options: { pooling: "mean"; normalize: true },
) => Promise<{ tolist(): number[][] | number[][][] }>;
console.error(`ready (${Date.now() - tLoad}ms)\n`);

for (const query of queries) {
  const out = await extractor(query, { pooling: "mean", normalize: true });
  const raw = out.tolist();
  // single string input -> number[] not number[][]; normalise to number[]
  const vec = (Array.isArray(raw[0]) ? raw[0] : raw) as number[];
  const vecLit = `[${vec.join(",")}]`;

  const rows = await sql<
    {
      id: string;
      kind: string | null;
      repo: string | null;
      importance: number;
      preview: string;
      similarity: number;
    }[]
  >`
    SELECT id, kind, repo, importance,
           substring(content, 1, 180) AS preview,
           round(((1 - (embedding <=> ${vecLit}::vector)))::numeric, 3)::float8 AS similarity
    FROM memories
    WHERE archived_at IS NULL
      AND (meta->>'shadow_of') IS NULL
    ORDER BY embedding <=> ${vecLit}::vector
    LIMIT ${TOP_K};
  `;

  console.log(`\n=== query: "${query}" ===`);
  for (const r of rows) {
    const id8 = r.id.slice(0, 8);
    const repo = r.repo ? r.repo.replace("github.com/", "") : "-";
    console.log(
      `[${r.similarity.toFixed(3)}] ${id8} · ${r.kind ?? "-"} · ${repo} · imp ${r.importance.toFixed(2)}`,
    );
    console.log(`   ${r.preview.replace(/\n/g, " ").trim()}`);
  }
}

await sql.end();
