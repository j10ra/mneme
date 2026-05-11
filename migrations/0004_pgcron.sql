-- Phase 0: scheduled jobs.
-- Reference: ARCHITECTURE.md §9.4 retention
--
-- Daily prune: drop _ops.traces older than 14 days. Cascades to spans
-- and logs.
--
-- This migration NO-OPs on Postgres installs without pg_cron (Railway,
-- Neon, self-host without the extension). The app-level prune worker
-- in packages/server/src/worker/prune.ts is the canonical retention
-- enforcer in either case.

DO $pgcron_optional$
BEGIN
  PERFORM cron.schedule(
    'mneme_ops_prune',
    '0 3 * * *',
    $cron_body$DELETE FROM _ops.traces WHERE started_at < now() - interval '14 days'$cron_body$
  );
  RAISE NOTICE 'scheduled mneme_ops_prune via pg_cron';
EXCEPTION WHEN undefined_schema OR undefined_function OR undefined_table THEN
  RAISE NOTICE 'pg_cron not installed; mneme_ops_prune skipped (app-level prune is canonical)';
END;
$pgcron_optional$;
