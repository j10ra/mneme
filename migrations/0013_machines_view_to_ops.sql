-- Move the machines view from public to _ops.
--
-- 0012 dropped it in `public` because mneme_reader already had blanket
-- SELECT on public.* — but it doesn't belong there. `public` holds user
-- data (memories, captures); the skill teaches those as the schema and a
-- third admin-flavoured view in the same namespace surprises the agent.
-- `_ops` is the convention for everything observability/admin.
-- mneme_reader already has narrow USAGE + SELECT precedent there
-- (_ops.worker_runs from migration 0007), so this fits the same pattern.
--
-- Same shape, same columns, same predicate (machine_id IS NOT NULL); only
-- the namespace changes.

DROP VIEW IF EXISTS public.machines;

CREATE OR REPLACE VIEW _ops.machines AS
SELECT
  machine_id,
  name,
  created_at,
  last_used_at,
  revoked_at
FROM _ops.api_keys
WHERE machine_id IS NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mneme_reader') THEN
    -- USAGE on _ops was already granted in 0007 for worker_runs.
    GRANT SELECT ON _ops.machines TO mneme_reader;
  END IF;
END $$;
