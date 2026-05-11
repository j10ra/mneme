-- One-time cleanup + permanent automation for _ops.logs retention.
-- Pre-existing daily prune (mneme_ops_prune) only deletes _ops.traces; spans
-- cascade via FK, but logs.trace_id had no FK and traceless logs had no rule
-- at all. After this migration, every log row prunes within 14 days.

-- 1. One-time: drop orphaned logs whose parent trace has already been pruned.
DELETE FROM _ops.logs l
WHERE l.trace_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM _ops.traces t WHERE t.trace_id = l.trace_id);

-- 2. One-time: drop traceless logs older than 14 days (matches the trace
--    retention window so all log surfaces age out at the same horizon).
DELETE FROM _ops.logs
WHERE trace_id IS NULL
  AND ts < now() - interval '14 days';

-- 3. Permanent: FK + cascade so traceful logs auto-prune with their parent
--    trace going forward. The orphan cleanup above is what makes this safe
--    to add — without it, the ALTER would fail on the dangling references.
ALTER TABLE _ops.logs
  ADD CONSTRAINT logs_trace_id_fkey
  FOREIGN KEY (trace_id) REFERENCES _ops.traces (trace_id) ON DELETE CASCADE;

-- 4. Permanent: schedule a sibling cron for traceless logs (age-only,
--    since they have no parent to cascade from). Runs 5 minutes after
--    the traces prune to avoid lock contention with the cascade pass.
--    NO-OPs without pg_cron — app-level prune covers it regardless.
DO $pgcron_optional$
BEGIN
  PERFORM cron.schedule(
    'mneme_ops_logs_prune',
    '5 3 * * *',
    $cron_body$DELETE FROM _ops.logs WHERE trace_id IS NULL AND ts < now() - interval '14 days'$cron_body$
  );
  RAISE NOTICE 'scheduled mneme_ops_logs_prune via pg_cron';
EXCEPTION WHEN undefined_schema OR undefined_function OR undefined_table THEN
  RAISE NOTICE 'pg_cron not installed; mneme_ops_logs_prune skipped (app-level prune is canonical)';
END;
$pgcron_optional$;
