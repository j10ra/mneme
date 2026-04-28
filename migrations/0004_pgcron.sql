-- Phase 0: scheduled jobs.
-- Reference: ARCHITECTURE.md §9.4 retention

-- Daily prune: drop _ops.traces older than 14 days. Cascades to spans and logs.
SELECT cron.schedule(
  'mneme_ops_prune',
  '0 3 * * *',
  $$DELETE FROM _ops.traces WHERE started_at < now() - interval '14 days'$$
);
