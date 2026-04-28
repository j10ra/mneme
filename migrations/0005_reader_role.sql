-- Phase 2 prep: read-only Postgres role for the /mcp tool.
--
-- The MCP `mneme.sql` tool runs SELECT queries on behalf of the agent.
-- Defense in depth: even though the route enforces SELECT-only at the
-- regex level, the underlying connection runs as a role that physically
-- cannot INSERT/UPDATE/DELETE anywhere, and cannot see _ops.* tables
-- (which contain auth metadata, traces, and logs that don't belong in
-- the agent's reach).
--
-- After this migration applies, set the password out-of-band and put the
-- resulting connection string in .env as MNEME_READER_DATABASE_URL:
--
--   ALTER ROLE mneme_reader WITH LOGIN PASSWORD '<random>';

CREATE ROLE mneme_reader NOLOGIN;

GRANT CONNECT ON DATABASE postgres TO mneme_reader;

-- public schema only (where Mneme data lives). _ops stays unreachable.
GRANT USAGE ON SCHEMA public TO mneme_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mneme_reader;

-- Future tables in public also get SELECT automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO mneme_reader;
