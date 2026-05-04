-- Centralized scheduler tracking for time-driven workers (nap, keepalive,
-- eventually dream). One row per registered job. The scheduler wakes every
-- minute, fires rows where next_run_at <= now(), and updates this table.
-- Persisting next_run_at survives Railway redeploys without skipping cycles.
--
-- Queue-driven workers (extract, embed) keep their tight polling loops and
-- are NOT registered here — the scheduler is only for time-driven jobs.

CREATE TABLE IF NOT EXISTS _ops.worker_runs (
  job_name         TEXT        PRIMARY KEY,
  schedule_ms      BIGINT      NOT NULL CHECK (schedule_ms > 0),
  next_run_at      TIMESTAMPTZ NOT NULL,
  last_run_at      TIMESTAMPTZ,
  last_status      TEXT        CHECK (last_status IN ('ok', 'failed')),
  last_error       TEXT,
  last_duration_ms INTEGER,
  registered_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS worker_runs_next_run_idx
  ON _ops.worker_runs (next_run_at)
  WHERE last_status IS DISTINCT FROM 'failed' OR last_status IS NULL;

-- Reader role gets read access for ops visibility via the mneme.sql MCP.
-- Granting USAGE on the schema is required even for a single-table SELECT.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mneme_reader') THEN
    GRANT USAGE ON SCHEMA _ops TO mneme_reader;
    GRANT SELECT ON _ops.worker_runs TO mneme_reader;
  END IF;
END $$;
