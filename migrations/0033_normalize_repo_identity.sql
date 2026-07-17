-- One-time backfill: canonicalize `memories.repo` so historical rows share the
-- key that ingest has written since #75.
--
-- Background: `repo` is derived client-side from `git remote get-url origin`
-- and was stored verbatim. #75 added normalizeRepo at the write path (ingest,
-- bundle) but explicitly deferred the backfill ("Decide on backfill ... or
-- leave historical rows and only normalize going forward"), so every row
-- captured before that fix still carries its raw, non-canonical key. One
-- logical project therefore lives under two `repo` values, and the surface's
-- `repo = ANY(...)` only ever matches the newer half.
--
-- Two keys are affected in this corpus:
--   PinnacleCorpNZ@dev.azure.com/... (7684 rows, last written 2026-06-30)
--     -> dev.azure.com/...           (rejoins the live key)
--   jalipalo-bc:<token>@github.com/blockchain/... (1360 rows)
--     -> github.com/blockchain/...
--
-- The second also closes the security note on #75: that clone URL embedded a
-- live GitHub PAT, so the token is sitting in cleartext in `memories.repo`.
-- The reader-role scrubber masks it in `mneme_sql` output, but the stored
-- value is raw. Stripping userinfo removes it from the column. (Rotation is
-- tracked separately and stays the owner's call.)
--
-- Scope — userinfo only. The other forms normalizeRepo handles are verified
-- absent here: 0 rows carry a scheme, 0 a `.git` suffix, 0 a trailing slash,
-- and 0 are scp-style (the 1360 rows with a colon in the first segment hold it
-- *inside* the userinfo, which statement 1 removes). Statement 2 lowercases the
-- host for parity with normalizeRepo; after statement 1 both hosts are already
-- lowercase, so it matches nothing today and exists to keep the two
-- implementations honest. Going forward ingest normalizes, so this cannot
-- re-accumulate.
--
-- `captures` is deliberately untouched: captures are raw and immutable
-- (docs/data-model.md), so its historical `repo` stays as-recorded. The only
-- reader that spans both is the surface's delta count, which anchors to the
-- most recent summary and so reads captures written after #75 (already
-- canonical).
--
-- Safety: `chunk_id` is sha256(content_hash:embedding_model) — it does not
-- include `repo`, so rewriting `repo` neither invalidates it nor risks the
-- UNIQUE(chunk_id) constraint. That same content-addressing means identical
-- content could never have been inserted under both keys, so the merge cannot
-- introduce duplicates. No index on `repo` is unique.
--
-- Idempotent: both statements are guarded on the un-normalized shape, so a
-- clean corpus matches no rows and a re-run is a no-op.

-- 1. Strip userinfo: drop everything up to and including the first `@` that
--    precedes the path. A path-internal `@` (after the first `/`) is left
--    alone, matching normalizeRepo.
UPDATE memories
SET repo = substring(repo FROM position('@' IN split_part(repo, '/', 1)) + 1)
WHERE repo IS NOT NULL
  AND repo NOT LIKE 'dir:%'
  AND position('@' IN split_part(repo, '/', 1)) > 0;

-- 2. Lowercase the host segment; path case is preserved (paths can be
--    case-sensitive and must match what the client stored).
UPDATE memories
SET repo = lower(split_part(repo, '/', 1)) || substring(repo FROM position('/' IN repo))
WHERE repo IS NOT NULL
  AND repo NOT LIKE 'dir:%'
  AND position('/' IN repo) > 0
  AND split_part(repo, '/', 1) <> lower(split_part(repo, '/', 1));
