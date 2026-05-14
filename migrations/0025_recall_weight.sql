-- #37: Use-driven reinforcement (LTP). recall_weight accumulates on every
-- mneme_sql access where the agent's intent is clear (explicit UUIDs in the
-- WHERE clause, the /recall marker, or a narrowed ≤10-row query), then
-- decays on each nap cycle. Surface + Layer-1 ranking add a bounded
-- ln(1 + recall_weight) term so frequently-used memories drift up.
--
-- Separate from `importance`: importance = meaning (LLM-rated at extract),
-- recall_weight = use (accumulated over time). Don't conflate.

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS recall_weight real NOT NULL DEFAULT 0;
