-- Tighten the RLS policies introduced in 0009.
--
-- 0009 included `current_setting('mneme.machine_id', true) = '*'` as an
-- admin-bypass sentinel so admin tokens (no machineId) could inspect
-- private rows via the MCP `mneme.sql` tool. That was a mistake: the MCP
-- product surface is "agent runs arbitrary SELECT". A caller can call
-- `set_config('mneme.machine_id', '*', true)` from inside their own
-- query (e.g. via a CTE) and flip the GUC mid-transaction, turning the
-- bypass into a full private-row read by anyone with `mcp` scope.
--
-- New invariant: MCP with a machine token may see public rows plus its
-- own machine's private rows. Admin tokens (machineId = NULL → empty
-- GUC) see only public rows via MCP. Admin private-row inspection
-- happens through a direct DB connection (DATABASE_URL), not through
-- mneme.sql.
--
-- Even with the `*` removed, a malicious machine could in principle
-- still call `set_config('mneme.machine_id', '<other-uuid>', true)`
-- inside their query to impersonate another machine. mcp.ts blocks
-- `set_config` in the SELECT-rewrite layer as defense in depth, but
-- the proper architectural fix (per-machine reader roles, or AST-level
-- query rewriting) is deferred until a `private=true` capture flow
-- actually exists. Today there are zero private rows in production.

DROP POLICY IF EXISTS mneme_reader_memories ON memories;
DROP POLICY IF EXISTS mneme_reader_captures ON captures;

CREATE POLICY mneme_reader_memories ON memories
  AS PERMISSIVE
  FOR SELECT
  TO mneme_reader
  USING (
    private = false
    OR machine_id = current_setting('mneme.machine_id', true)
  );

CREATE POLICY mneme_reader_captures ON captures
  AS PERMISSIVE
  FOR SELECT
  TO mneme_reader
  USING (
    private = false
    OR machine_id = current_setting('mneme.machine_id', true)
  );
