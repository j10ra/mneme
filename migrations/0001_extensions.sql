-- Phase 0: required Postgres extensions for Mneme.
--
-- pgcrypto and vector are required everywhere. pg_cron is OPTIONAL: it
-- shipped on Supabase but isn't available on Railway / Neon / most
-- managed Postgres providers. App-level prune in
-- packages/server/src/worker/prune.ts is the canonical retention
-- enforcer regardless of whether pg_cron is installed. The DO/EXCEPTION
-- wrapper below lets the migration succeed on hosts that don't ship
-- pg_cron.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

DO $pgcron_optional$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  RAISE NOTICE 'pg_cron installed (migrations 0004 + 0008 will schedule jobs)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available on this Postgres; relying on app-level prune (packages/server/src/worker/prune.ts)';
END;
$pgcron_optional$;
