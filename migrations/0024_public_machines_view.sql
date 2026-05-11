-- Expose machine names to the mneme_reader role.
--
-- Background: `_ops.api_keys` holds per-machine tokens (and other auth
-- metadata) which mneme_reader must NEVER see. The existing curated
-- view `_ops.machines` projects only the safe columns (machine_id,
-- name, created_at, last_used_at, revoked_at), but the view itself
-- still lives in `_ops` where mneme_reader has no USAGE privilege.
--
-- This migration re-exposes that curated view inside `public.*` so
-- agents calling `mneme_sql` can resolve `memories.machine_id ->
-- machine.name` without us granting any broader access to `_ops.*`.
-- Idempotent via CREATE OR REPLACE so re-runs are safe.

CREATE OR REPLACE VIEW public.machines AS
  SELECT machine_id, name, created_at, last_used_at, revoked_at
  FROM _ops.machines;

-- mneme_reader already has SELECT ON ALL TABLES IN SCHEMA public via
-- migration 0005, and the ALTER DEFAULT PRIVILEGES there covers future
-- relations. Explicit GRANT here is belt-and-braces for installs that
-- didn't honor the default-privileges row (e.g. if the role existed
-- before the ALTER DEFAULT PRIVILEGES statement ran).
GRANT SELECT ON public.machines TO mneme_reader;
