-- Supersede correctness (2026-05-20 spec): clear wrong-direction memory
-- supersede flags written before server-boundary validation existed.
--
-- A memory's meta.superseded_by must point at a STRICTLY NEWER memory.
-- dream's pre-validation LLM pass could write it backwards (the newer
-- memory placed as the superseded one), which inverts the query-time
-- signal: the surface drops the current truth and recall ranks the stale
-- fact above it. Stripping the flag leaves the row un-superseded (it
-- resurfaces) rather than re-pointed -- a wrong-direction flag does not
-- prove the reverse relationship is real, so re-correction is left to the
-- next dream/digest pass.
--
-- old.kind IS DISTINCT FROM 'cluster' is MANDATORY: digest's applyMerge
-- writes superseded_by on losing CLUSTER rows, choosing the winner by
-- importance, not recency -- so a chronology test legitimately matches
-- valid cluster merges. Excluding clusters scopes the cleanup to memory
-- rows only. IS DISTINCT FROM (not <>) so a NULL kind -- which is a memory
-- row, not a cluster -- is still cleaned rather than silently skipped.
--
-- Measured 2026-05-20: this predicate matches 1 row.

UPDATE memories old
SET meta = old.meta - 'superseded_by'
FROM memories new
WHERE old.meta->>'superseded_by' = new.id::text
  AND old.created_at >= new.created_at
  AND old.kind IS DISTINCT FROM 'cluster';
