-- _ops.crystallize_runs: leader-election ledger for distributed crystallize
-- cycles. Daemons attempt INSERT ... ON CONFLICT DO NOTHING keyed by the
-- time-window slot; exactly one wins, the rest skip. Mirrors dream_runs.
CREATE TABLE IF NOT EXISTS _ops.crystallize_runs (
  window_key             BIGINT PRIMARY KEY,
  claimed_by_machine_id  UUID NOT NULL,
  claimed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at           TIMESTAMPTZ,
  concept_count          INTEGER
);

CREATE INDEX IF NOT EXISTS crystallize_runs_claimed_at_idx
  ON _ops.crystallize_runs (claimed_at DESC);
