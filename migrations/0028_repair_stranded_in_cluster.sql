-- One-time repair: repoint meta.in_cluster off superseded clusters.
--
-- digest's pre-fix cluster-merge loop could, within a single cycle,
-- supersede a cluster and then still load it as a merge winner -- so
-- some members ended up pointing meta.in_cluster at a cluster that is
-- itself superseded. A recall walk from those members lands on a dead
-- cluster instead of the live one.
--
-- This recursive CTE follows each superseded cluster's superseded_by
-- chain to its terminal (non-superseded) cluster, then repoints every
-- member whose in_cluster is a superseded cluster. Idempotent: re-running
-- finds no superseded in_cluster targets and updates nothing.

WITH RECURSIVE chain AS (
  SELECT id AS cluster_id,
         (meta->>'superseded_by')::uuid AS next_id,
         1 AS depth
  FROM memories
  WHERE kind = 'cluster'
    AND (meta->>'superseded_by') IS NOT NULL
  UNION ALL
  SELECT c.cluster_id,
         (m.meta->>'superseded_by')::uuid,
         c.depth + 1
  FROM chain c
  JOIN memories m ON m.id = c.next_id
  WHERE (m.meta->>'superseded_by') IS NOT NULL
),
terminal AS (
  SELECT DISTINCT ON (cluster_id) cluster_id, next_id AS terminal_id
  FROM chain
  ORDER BY cluster_id, depth DESC
)
UPDATE memories tgt
SET meta = jsonb_set(tgt.meta, '{in_cluster}', to_jsonb(t.terminal_id::text))
FROM terminal t
WHERE (tgt.meta->>'in_cluster') = t.cluster_id::text;
