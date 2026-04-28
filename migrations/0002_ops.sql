-- Phase 0: _ops schema for tracing, logs, auth.
-- Reference: ARCHITECTURE.md §9.4

CREATE SCHEMA IF NOT EXISTS _ops;

-- Traces: one row per request/job (root span lifecycle).
CREATE TABLE _ops.traces (
  trace_id        UUID PRIMARY KEY,
  root_span_name  TEXT NOT NULL,
  source          TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  duration_ms     INT
);
CREATE INDEX traces_started_idx ON _ops.traces (started_at DESC);
CREATE INDEX traces_source_idx  ON _ops.traces (source);

-- Spans: nested under traces (cascade-deleted with parent trace).
CREATE TABLE _ops.spans (
  span_id        UUID PRIMARY KEY,
  trace_id       UUID NOT NULL REFERENCES _ops.traces ON DELETE CASCADE,
  parent_span_id UUID,
  name           TEXT NOT NULL,
  started_at     TIMESTAMPTZ NOT NULL,
  duration_ms    INT,
  error_message  TEXT,
  input_size     INT,
  output_size    INT,
  input          JSONB,
  output         JSONB
);
CREATE INDEX spans_trace_idx  ON _ops.spans (trace_id);
CREATE INDEX spans_parent_idx ON _ops.spans (parent_span_id) WHERE parent_span_id IS NOT NULL;

-- Logs: structured entries optionally linked to a trace/span.
CREATE TABLE _ops.logs (
  id        BIGSERIAL PRIMARY KEY,
  trace_id  UUID,
  span_id   UUID,
  level     TEXT NOT NULL,
  message   TEXT NOT NULL,
  ts        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX logs_trace_idx ON _ops.logs (trace_id);
CREATE INDEX logs_ts_idx    ON _ops.logs (ts DESC);
CREATE INDEX logs_level_idx ON _ops.logs (level) WHERE level IN ('warn', 'error');

-- API keys: hashed Bearer tokens, per-machine, scoped, revocable.
CREATE TABLE _ops.api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash      TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  machine_id    TEXT,
  scopes        TEXT[] NOT NULL DEFAULT '{capture,read,mcp}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);
CREATE INDEX api_keys_active_idx ON _ops.api_keys (key_hash) WHERE revoked_at IS NULL;
