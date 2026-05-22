-- Round-robin watermark indexes for the dream and digest workers.
--
-- Both workers paginate by selecting least-recently-visited rows first
-- and stamping a meta timestamp on every row considered. Same pattern
-- and rationale as migration 0019 (nap's meta.last_napped_at): ISO-8601
-- timestamp strings sort lexically the same as chronologically, so the
-- raw meta->>'...' text expression is indexed directly with no
-- non-IMMUTABLE ::timestamptz cast.
--
-- last_dreamed_at: dream's seed selection filters archived_at IS NULL
-- AND embedding IS NOT NULL, so the partial index matches that predicate.
--
-- last_digested_at: serves both digest operations -- Op1 scans cluster
-- rows, Op2 scans member rows -- so the partial index is keyed only on
-- archived_at IS NULL.

CREATE INDEX IF NOT EXISTS memories_last_dreamed_at_idx
  ON memories (
    (meta->>'last_dreamed_at') NULLS FIRST,
    created_at
  )
  WHERE archived_at IS NULL AND embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS memories_last_digested_at_idx
  ON memories (
    (meta->>'last_digested_at') NULLS FIRST,
    created_at
  )
  WHERE archived_at IS NULL;
