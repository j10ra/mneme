-- Phase 1 of #36 (cont.): recreate the HNSW index on the 384-dim column.
--
-- Idempotent via IF NOT EXISTS so this works in both flows:
--   - Existing installs: 0022 dropped the index; this recreates it on
--     the still-empty column, and reembed.ts populates it row-by-row.
--   - Fresh installs: 0003 already created an HNSW index on what was
--     vector(1024) at the time; 0022 alters the column and drops the
--     index; this re-creates it on vector(384). No data exists yet so
--     the index is just there for new captures to land into.
--
-- HNSW parameters match the original m=16, ef_construction=64 (from
-- migrations/0003_mneme.sql).

CREATE INDEX IF NOT EXISTS memories_embedding_idx
  ON memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
