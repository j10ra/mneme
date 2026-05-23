-- One-time repair: clear meta.in_cluster on memories that are themselves
-- superseded.
--
-- The three supersede write paths (dream's writeClusters, nap's rule-based
-- pass, digest's Op2 cross-cluster pass) used to set meta.superseded_by
-- without touching meta.in_cluster, so a memory that got clustered first
-- and then superseded retained both keys. Pre-fix corpora accumulated ~163
-- such "semantic orphans" -- the memory is logically retired but the
-- cluster's member_ids array (and the member's in_cluster pointer) still
-- referenced it.
--
-- Going forward those three write paths set both keys atomically (see the
-- companion code change), so this migration only fixes the legacy debt.
-- Idempotent: a clean corpus matches no rows and updates nothing.

UPDATE memories
SET meta = meta - 'in_cluster'
WHERE kind <> 'cluster'
  AND (meta->>'superseded_by') IS NOT NULL
  AND (meta->>'in_cluster') IS NOT NULL;
