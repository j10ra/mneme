-- One-time relabel: cluster rows whose embedding_model was stale-hardcoded
-- to BAAI/bge-large-en-v1.5 in dream's writeClusters get re-labeled to
-- match what the daemon actually emitted (bge-small).
--
-- Background: post-#36 the daemon switched from bge-large (1024-dim) to
-- bge-small (384-dim) for all embedding, but dream.ts kept a hardcoded
-- literal "BAAI/bge-large-en-v1.5" when writing kind='cluster' rows.
-- The embedding column on those rows holds 384-dim bge-small vectors
-- (the column itself is vector(384), enforced at insert time) while
-- the embedding_model label said 1024-dim bge-large. Dim and label
-- disagreed.
--
-- 1.1.62 fixes the hardcoded literal in writeClusters to import
-- EMBEDDER_MODEL from infra/config.ts. This migration backfills the
-- 89 existing mislabeled rows. chunk_id stays untouched: the rows are
-- already there with their original hash, dedup still works inside that
-- string namespace, recomputing chunk_id would break the UNIQUE
-- constraint without surfacing any new dupes.
--
-- Idempotent: a clean corpus matches no rows.

UPDATE memories
SET embedding_model = 'BAAI/bge-small-en-v1.5'
WHERE kind = 'cluster'
  AND embedding_model = 'BAAI/bge-large-en-v1.5';
