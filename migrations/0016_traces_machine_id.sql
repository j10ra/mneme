-- Stamp daemon-originated traces with the machine that emitted them.
--
-- Server-emitted traces (from mnemeRoute on /api/* routes) have NULL
-- machine_id. Daemon-emitted traces (forwarded via /api/ingest/spans)
-- carry the registered machine_id of the daemon, derived from the
-- machine token used to authenticate the upload. This lets queries
-- like "show me extract latency on macbook-pro over the last hour"
-- pivot off a single column without joining through captures.

ALTER TABLE _ops.traces ADD COLUMN IF NOT EXISTS machine_id UUID;

CREATE INDEX IF NOT EXISTS traces_machine_id_idx
  ON _ops.traces (machine_id)
  WHERE machine_id IS NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mneme_reader') THEN
    GRANT SELECT ON _ops.traces TO mneme_reader;
    GRANT SELECT ON _ops.spans  TO mneme_reader;
    GRANT SELECT ON _ops.logs   TO mneme_reader;
  END IF;
END $$;
