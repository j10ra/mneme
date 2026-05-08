-- Observability views for ad-hoc operator dashboards. Issue #14.
--
-- One namespace, one prefix: `_ops.dashboard_*`. Each view is read-only,
-- composable through `mneme_sql`, and the contract any future Grafana /
-- Metabase / built-in viewer wiring should bind to so we can move the
-- query layer without touching downstream consumers.
--
-- Saved queries the operator typically wants:
--
--   -- Capture rate, last 14d
--   SELECT day, source, sum(captures) AS n
--   FROM _ops.dashboard_capture_rate
--   WHERE day > now() - interval '14 days'
--   GROUP BY day, source ORDER BY day DESC, n DESC;
--
--   -- Current daemon health (one row per machine)
--   SELECT machine_name, outbox_pending, outbox_failed, posted_at, stale
--   FROM _ops.dashboard_queue_depth ORDER BY posted_at DESC;
--
--   -- Dream cycles, last 30d
--   SELECT claimed_at, status, duration_s, cluster_count
--   FROM _ops.dashboard_dream_health
--   WHERE claimed_at > now() - interval '30 days'
--   ORDER BY claimed_at DESC LIMIT 50;
--
--   -- Stale repos (no fresh cluster summary)
--   SELECT repo, latest_cluster_at, hours_since, clusters_last_7d
--   FROM _ops.dashboard_surface_freshness
--   WHERE hours_since > 48 ORDER BY hours_since DESC;
--
--   -- Extract throughput, last 14d
--   SELECT day, captures, extracted, not_extracted, memories
--   FROM _ops.dashboard_extract_throughput
--   WHERE day > now() - interval '14 days' ORDER BY day DESC;
--
-- Embed cost tracking is intentionally absent: post-#22 the daemon owns
-- embedding via a quantized local model (zero $/call). Cloud LLM cost
-- (server-side dream distillation) is not tracked yet — when it matters,
-- add it as `_ops.dashboard_llm_cost` reading from `_ops.spans`.

-- ─────────────────────────────────────────────────────────────────────
-- Capture rate. Per-day captures, broken out so an operator can answer
-- "did one machine go quiet?" / "did claude_assistant turns spike?".
CREATE OR REPLACE VIEW _ops.dashboard_capture_rate AS
SELECT
  date_trunc('day', captured_at) AS day,
  source,
  harness,
  machine_id,
  count(*)::int AS captures
FROM captures
WHERE archived_at IS NULL
GROUP BY 1, 2, 3, 4;

-- ─────────────────────────────────────────────────────────────────────
-- Queue depth. Latest heartbeat per machine, joined to the latest
-- non-revoked api_keys row for a friendly label. `stale` flips when
-- posted_at is older than 3× the heartbeat interval (60s).
CREATE OR REPLACE VIEW _ops.dashboard_queue_depth AS
SELECT
  h.machine_id::text AS machine_id,
  m.name AS machine_name,
  h.outbox_pending,
  h.outbox_extracted,
  h.outbox_embedded,
  h.outbox_failed,
  h.last_processed_at,
  h.posted_at,
  ((now() - h.posted_at) > interval '3 minutes') AS stale
FROM _ops.daemon_heartbeats h
LEFT JOIN LATERAL (
  SELECT name FROM _ops.api_keys
  WHERE machine_id = h.machine_id::text AND revoked_at IS NULL
  ORDER BY last_used_at DESC NULLS LAST, created_at DESC
  LIMIT 1
) m ON TRUE;

-- ─────────────────────────────────────────────────────────────────────
-- Dream health. One row per claimed window with duration + status.
-- "stuck" fires when a leader claimed the lock but never wrote
-- completed_at; reaped after 30min by the next nap cycle.
CREATE OR REPLACE VIEW _ops.dashboard_dream_health AS
SELECT
  window_key,
  claimed_by_machine_id,
  claimed_at,
  completed_at,
  CASE
    WHEN completed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (completed_at - claimed_at))
    ELSE NULL
  END::numeric(8,1) AS duration_s,
  cluster_count,
  CASE
    WHEN completed_at IS NOT NULL THEN 'done'
    WHEN claimed_at < now() - interval '30 minutes' THEN 'stuck'
    ELSE 'in_flight'
  END AS status
FROM _ops.dream_runs;

-- ─────────────────────────────────────────────────────────────────────
-- Surface freshness. Per repo: when did we last write a cluster summary,
-- and how many in the last 7 days. Repos that drop off (hours_since
-- climbing) usually mean the dream cycle's running but the repo doesn't
-- have enough new memories to form clusters at DREAM_MIN_CLUSTER_SIZE.
CREATE OR REPLACE VIEW _ops.dashboard_surface_freshness AS
SELECT
  repo,
  max(created_at) AS latest_cluster_at,
  (EXTRACT(EPOCH FROM (now() - max(created_at))) / 3600.0)::numeric(8,1) AS hours_since,
  count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS clusters_last_7d,
  count(*)::int AS clusters_total
FROM memories
WHERE kind = 'cluster' AND archived_at IS NULL
GROUP BY repo;

-- ─────────────────────────────────────────────────────────────────────
-- Extract throughput. Per day: captures landed, captures with at least
-- one memory chunk (extracted), captures with none (not_extracted), and
-- total memory chunks produced. `not_extracted` includes the legitimate
-- skip cases (claude_summary noise, sub-200-char assistant turns) along
-- with anything genuinely stuck — operator interprets via spot-checks.
CREATE OR REPLACE VIEW _ops.dashboard_extract_throughput AS
SELECT
  date_trunc('day', c.captured_at) AS day,
  count(DISTINCT c.id)::int AS captures,
  count(DISTINCT c.id) FILTER (WHERE m.id IS NOT NULL)::int AS extracted,
  count(DISTINCT c.id) FILTER (WHERE m.id IS NULL)::int AS not_extracted,
  count(m.id)::int AS memories
FROM captures c
LEFT JOIN memories m ON m.capture_id = c.id AND m.archived_at IS NULL
WHERE c.archived_at IS NULL
GROUP BY 1;

-- ─────────────────────────────────────────────────────────────────────
-- Reader role gets SELECT on all five so they're queryable via
-- mneme_sql. _ops USAGE was already granted in 0007.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mneme_reader') THEN
    GRANT SELECT ON _ops.dashboard_capture_rate TO mneme_reader;
    GRANT SELECT ON _ops.dashboard_queue_depth TO mneme_reader;
    GRANT SELECT ON _ops.dashboard_dream_health TO mneme_reader;
    GRANT SELECT ON _ops.dashboard_surface_freshness TO mneme_reader;
    GRANT SELECT ON _ops.dashboard_extract_throughput TO mneme_reader;
  END IF;
END $$;
