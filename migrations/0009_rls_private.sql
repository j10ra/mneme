-- Row-level security so the mneme_reader role (used by the MCP `mneme.sql`
-- tool) can only read private rows that belong to the calling machine.
--
-- Before this migration, the SessionStart surface enforced privacy at query
-- construction time but the MCP tool ran arbitrary SELECTs through the
-- reader role with no row filter. Any machine token with `mcp` scope could
-- ask for `private = true` rows from any machine. Privacy was enforced by
-- agent discipline, not by the server.
--
-- After this migration:
--  - memories and captures have RLS enabled
--  - mneme_reader's USING policy gates rows on `private = false` OR a
--    per-transaction `mneme.machine_id` GUC matching the row's machine_id
--  - the GUC value `*` is treated as a bypass sentinel so admin tokens
--    (which have no machine_id) can still inspect everything
--  - the writer (table owner) is unaffected by RLS by default
--
-- mcp.ts wraps every query in a tx and calls
-- `set_config('mneme.machine_id', <caller>, true)` so the GUC is scoped to
-- the transaction and never leaks into other connections in the pool.

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mneme_reader_memories ON memories;
DROP POLICY IF EXISTS mneme_reader_captures ON captures;

CREATE POLICY mneme_reader_memories ON memories
  AS PERMISSIVE
  FOR SELECT
  TO mneme_reader
  USING (
    private = false
    OR current_setting('mneme.machine_id', true) = '*'
    OR machine_id = current_setting('mneme.machine_id', true)
  );

CREATE POLICY mneme_reader_captures ON captures
  AS PERMISSIVE
  FOR SELECT
  TO mneme_reader
  USING (
    private = false
    OR current_setting('mneme.machine_id', true) = '*'
    OR machine_id = current_setting('mneme.machine_id', true)
  );
