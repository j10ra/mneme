-- Phase 0: Mneme data schema (3 tables, additive forever).
-- Reference: ARCHITECTURE.md §5

-- Captures: raw, immutable. sha256 dedup at ingest.
CREATE TABLE captures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content         TEXT NOT NULL,
  content_sha256  TEXT NOT NULL,
  source          TEXT NOT NULL,
  machine_id      TEXT NOT NULL,
  hostname        TEXT NOT NULL,
  repo            TEXT,
  harness         TEXT NOT NULL,
  agent           TEXT,
  session_id      TEXT,
  topics          TEXT[] NOT NULL DEFAULT '{}',
  private         BOOLEAN NOT NULL DEFAULT false,
  raw_meta        JSONB NOT NULL DEFAULT '{}',
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ,
  UNIQUE (content_sha256, machine_id)
);

CREATE INDEX captures_repo_idx     ON captures (repo)        WHERE archived_at IS NULL;
CREATE INDEX captures_session_idx  ON captures (session_id)  WHERE archived_at IS NULL;
CREATE INDEX captures_captured_at  ON captures (captured_at DESC);

-- Memories: chunked, embedded, BM25-indexed. chunk_id encodes embedding model
-- so re-embed migrations can land new rows without colliding with the old.
-- Cluster summaries are also memories (kind='cluster').
CREATE TABLE memories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id       UUID NOT NULL REFERENCES captures(id),
  chunk_id         TEXT NOT NULL UNIQUE,
  content          TEXT NOT NULL,
  content_hash     TEXT NOT NULL,
  embedding        VECTOR(1024),
  embedding_model  TEXT NOT NULL,
  tsv              TSVECTOR,
  kind             TEXT,
  importance       REAL NOT NULL DEFAULT 1.0,

  -- denormalized scope for fast filter
  machine_id       TEXT NOT NULL,
  repo             TEXT,
  harness          TEXT NOT NULL,
  agent            TEXT,
  topics           TEXT[] NOT NULL DEFAULT '{}',
  private          BOOLEAN NOT NULL DEFAULT false,

  -- related_to, member_ids, superseded_by, shadow_of, pinned, ...
  meta             JSONB NOT NULL DEFAULT '{}',

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at      TIMESTAMPTZ
);

CREATE INDEX memories_embedding_idx  ON memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX memories_tsv_idx        ON memories USING gin (tsv);
CREATE INDEX memories_repo_idx       ON memories (repo)       WHERE archived_at IS NULL;
CREATE INDEX memories_kind_idx       ON memories (kind)       WHERE archived_at IS NULL;
CREATE INDEX memories_importance_idx ON memories (importance DESC) WHERE archived_at IS NULL;
CREATE INDEX memories_meta_idx       ON memories USING gin (meta);

-- Ingest jobs: worker queue for async phases.
CREATE TABLE ingest_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id    UUID REFERENCES captures(id),
  phase         TEXT NOT NULL,
  state         TEXT NOT NULL,
  attempts      INT NOT NULL DEFAULT 0,
  error         TEXT,
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ
);

CREATE INDEX ingest_jobs_pending_idx
  ON ingest_jobs (scheduled_at)
  WHERE state IN ('queued', 'error');
