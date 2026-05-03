-- Phase 4 prep: embed jobs target a memory row, not a capture.
-- capture_id is already nullable. Extract jobs keep capture_id set; embed
-- jobs (enqueued by the extract worker after writing memories) use memory_id.
ALTER TABLE ingest_jobs
  ADD COLUMN memory_id UUID REFERENCES memories(id);

CREATE INDEX ingest_jobs_memory_id_idx
  ON ingest_jobs (memory_id)
  WHERE memory_id IS NOT NULL;
