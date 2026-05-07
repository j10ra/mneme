-- Tables that exist for the distributed-extract daemon (issue #22).
--
-- _ops.daemon_heartbeats: the daemon posts every 60s with its current
-- outbox depth and last-processed-at timestamp. Surfaces in
-- /api/auth/machines so "are my daemons healthy?" is a one-call answer.
-- One row per machine (UPSERT on machine_id); not historical.
--
-- _ops.dream_runs: leader-election ledger for distributed dream cycles.
-- Daemons attempt INSERT INTO _ops.dream_runs (window_key, ...) ON
-- CONFLICT DO NOTHING; whoever wins the row owns that 8h cycle. The
-- losing daemons skip and try the next window. Stale claims (no
-- completed_at after 30min) can be reaped by nap so a crashed leader
-- doesn't block the next cycle indefinitely.

CREATE TABLE IF NOT EXISTS _ops.daemon_heartbeats (
  machine_id        UUID PRIMARY KEY,
  outbox_pending    INTEGER NOT NULL DEFAULT 0,
  outbox_extracted  INTEGER NOT NULL DEFAULT 0,
  outbox_embedded   INTEGER NOT NULL DEFAULT 0,
  outbox_failed     INTEGER NOT NULL DEFAULT 0,
  last_processed_at TIMESTAMPTZ,
  posted_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS _ops.dream_runs (
  window_key             BIGINT PRIMARY KEY,
  claimed_by_machine_id  UUID NOT NULL,
  claimed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at           TIMESTAMPTZ,
  cluster_count          INTEGER
);

CREATE INDEX IF NOT EXISTS dream_runs_claimed_at_idx
  ON _ops.dream_runs (claimed_at DESC);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mneme_reader') THEN
    -- _ops USAGE already granted in 0007. Reader gets visibility into
    -- both tables for /mneme:status-style checks.
    GRANT SELECT ON _ops.daemon_heartbeats TO mneme_reader;
    GRANT SELECT ON _ops.dream_runs TO mneme_reader;
  END IF;
END $$;
