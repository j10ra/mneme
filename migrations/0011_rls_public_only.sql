-- Tighten MCP RLS to public-only.
--
-- 0010 dropped the `*` admin bypass but the policy still trusted
-- `current_setting('mneme.machine_id', true)`. The MCP `mneme.sql` tool
-- runs arbitrary SELECTs through the reader role, and Postgres lets the
-- user re-set custom GUCs from inside their own query — even with the
-- unquoted `set_config(...)` blocked at the SQL-rewrite layer, quoted
-- variants (`"set_config"(...)`, `pg_catalog."set_config"(...)`) and any
-- other function aliases keep the GUC mutable. Identity in a mutable GUC
-- + agent-controlled SQL = no real privacy enforcement.
--
-- New invariant: MCP sees public rows only, regardless of token type. No
-- GUC, nothing for the caller to override. The owning role (writer,
-- DATABASE_URL) bypasses RLS by default and stays the path for admin
-- private inspection. The SessionStart surface keeps its own machine-aware
-- filter because it builds queries server-side as the owner role; that
-- code path is unaffected.
--
-- When a `private = true` capture flow actually ships, the proper fix is
-- per-machine reader roles (or AST-level query rewriting in mcp.ts) so
-- machines can recall their own private memories via MCP without
-- depending on user-mutable session state. Today there are zero private
-- rows in production, so this tightening is invisible to current callers.

DROP POLICY IF EXISTS mneme_reader_memories ON memories;
DROP POLICY IF EXISTS mneme_reader_captures ON captures;

CREATE POLICY mneme_reader_memories ON memories
  AS PERMISSIVE
  FOR SELECT
  TO mneme_reader
  USING (private = false);

CREATE POLICY mneme_reader_captures ON captures
  AS PERMISSIVE
  FOR SELECT
  TO mneme_reader
  USING (private = false);
