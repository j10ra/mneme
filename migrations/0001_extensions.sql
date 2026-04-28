-- Phase 0: required Postgres extensions for Mneme.
-- pgcrypto and uuid-ossp ship pre-installed on Supabase; vector and pg_cron
-- need explicit CREATE EXTENSION.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;
