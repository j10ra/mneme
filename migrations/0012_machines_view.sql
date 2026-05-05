-- Expose the machine name → machine_id mapping to the MCP reader.
--
-- Captures and memories key on `machine_id` (UUID), but the human-friendly
-- name lives on `_ops.api_keys.name` and `_ops` is unreachable from the
-- reader role. Without this view there's no way for the agent to resolve a
-- query like "get recent conversation from qube-laptop" — it would have to
-- guess at hostnames or ask Boss for the UUID.
--
-- The names themselves are not secrets: captures already carry `hostname`,
-- and the surface routinely labels rows with `machine_id`. Exposing
-- (machine_id, name, created_at, last_used_at, revoked_at) closes the gap
-- without leaking auth material.
--
-- Hidden on purpose: `key_hash` (auth secret), `scopes` (irrelevant here),
-- `id` (the api_keys row's own PK; callers care about machine_id).

CREATE OR REPLACE VIEW public.machines AS
SELECT
  machine_id,
  name,
  created_at,
  last_used_at,
  revoked_at
FROM _ops.api_keys
WHERE machine_id IS NOT NULL;

GRANT SELECT ON public.machines TO mneme_reader;
