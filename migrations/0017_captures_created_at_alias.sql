-- Generated `created_at` column on captures, mirroring captured_at.
--
-- Agents (and humans) keep writing `captures.created_at` because that's
-- the canonical name on `memories` (and the most natural noun in
-- general). The captures table was originally `captured_at` to match
-- the hook semantics, and we've documented the gotcha in the using-mneme
-- skill, but the error keeps recurring on the MCP path
-- (`mneme.sql failed: column "created_at" does not exist`).
--
-- Cheapest fix that doesn't break anything: add `created_at` as a
-- generated stored column whose value is always `captured_at`. Both
-- column names work, the existing table layout is untouched, and the
-- agent's wrong-column-name reflex stops being a hard error.
--
-- Storage cost: 8 bytes/row × ~50k rows today = ~400KB. Negligible.

ALTER TABLE captures
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
  GENERATED ALWAYS AS (captured_at) STORED;

CREATE INDEX IF NOT EXISTS captures_created_at_idx
  ON captures (created_at DESC)
  WHERE archived_at IS NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mneme_reader') THEN
    GRANT SELECT ON captures TO mneme_reader;
  END IF;
END $$;
