-- Hardware-stable identifier so re-installing the plugin on the same
-- physical machine maps back to the same machine_id (instead of minting
-- a fresh row + zombie next to the old one).
--
-- Plugin computes a platform-specific stable id (IOPlatformUUID on
-- darwin, /etc/machine-id on linux, registry MachineGuid on win32) and
-- sends it on /api/auth/register. The route upserts: same fingerprint
-- + active row → rotate token, reuse machine_id; else insert new row.
--
-- Nullable so existing rows pre-migration keep working. The unique
-- index is partial: only enforced on active rows that actually have a
-- fingerprint, so legacy rows and revoked rows don't collide.

ALTER TABLE _ops.api_keys
  ADD COLUMN IF NOT EXISTS machine_fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_active_fingerprint_idx
  ON _ops.api_keys (machine_fingerprint)
  WHERE revoked_at IS NULL AND machine_fingerprint IS NOT NULL;
