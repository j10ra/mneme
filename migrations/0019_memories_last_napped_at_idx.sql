-- Index for nap's round-robin seed selection.
--
-- Nap caps its per-cycle seed set at NAP_PER_CYCLE_CAP (500) and picks
-- the least-recently-napped memories first via:
--
--   ORDER BY meta->>'last_napped_at' NULLS FIRST, created_at ASC
--   LIMIT 500
--
-- ISO 8601 timestamps written as strings (`2026-05-08T13:43:17.554Z`)
-- sort lexically the same as chronologically, so we index the raw
-- text expression — no `::timestamptz` cast, which Postgres rejects
-- in an index expression because the cast isn't IMMUTABLE (timezone-
-- dependent at session scope).
--
-- Without this index, the seed selection is a full sort over all
-- active+embedded memories every cycle (7k+ rows and growing). The
-- partial functional index keeps it O(log n) and matches the WHERE
-- clause of the seed selection, so Postgres uses an index-only path.

CREATE INDEX IF NOT EXISTS memories_last_napped_at_idx
  ON memories (
    (meta->>'last_napped_at') NULLS FIRST,
    created_at
  )
  WHERE archived_at IS NULL AND embedding IS NOT NULL;
