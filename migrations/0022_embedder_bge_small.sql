-- Phase 1 of #36: swap embedder from bge-large (1024-dim) to bge-small (384-dim).
--
-- ALTER COLUMN with USING NULL drops every existing embedding because
-- the source and target dimensions differ. Existing memories survive
-- (id, content, meta unchanged); only the vector column becomes NULL
-- until `packages/daemon/scripts/reembed.ts` repopulates it with
-- bge-small vectors.
--
-- DROP INDEX before the bulk UPDATE: each UPDATE on an HNSW-indexed
-- vector column re-inserts into the index, which is slower than
-- dropping the index, doing the UPDATEs, then recreating it. Migration
-- 0023 recreates the index (idempotent so it is also safe for fresh
-- installs that arrive here with an empty embeddings column).
--
-- Run order at cutover:
--   1. bun run migrate                                  (applies 0022 + 0023)
--   2. bun packages/daemon/scripts/reembed.ts           (fills new vectors)
--   3. /plugin update mneme on every machine + restart daemons
--
-- The 0023 CREATE INDEX runs against an empty column, so reembed's
-- UPDATEs end up re-indexing per row. For 8K rows this costs ~30s
-- more than a deferred-index path; acceptable for the cleanest fresh-
-- install story.

ALTER TABLE memories ALTER COLUMN embedding TYPE vector(384) USING NULL;
DROP INDEX IF EXISTS memories_embedding_idx;
