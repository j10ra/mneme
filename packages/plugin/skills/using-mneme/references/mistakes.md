# Common mistakes

Real failure patterns observed in production. Load when you hit a SQL error or an unexpected empty result.

> See also: [`schema.md`](./schema.md) for canonical column types, [`recipes.md`](./recipes.md) for the corrected query shapes.

---

## Schema confusion

| Mistake | Why it fails | Fix |
|---|---|---|
| `SELECT title FROM memories` | No `title` column. Cluster titles live in `meta->>'cluster_title'`. | Use `content` for the body, `meta->>'cluster_title'` for cluster names. |
| `FROM observations` | No `observations` table — that's claude-mem's schema, not Mneme. | Use `memories` (chunked + embedded) or `captures` (raw events). |
| `captures.kind` / `captures.embedding` / `captures.tsv` | These columns are **only on `memories`**, not `captures`. | If you need kind filtering, embeddings, or BM25, query `memories`. If `memories` is empty for your query, fall back to `ILIKE` on `captures.content`. |
| `WHERE source = 'note'` | `source` is the *event origin* (`claude_hook`, `claude_summary`, `manual:/memory`, etc.); `note` is a *kind* on memories. | `source = 'manual:/memory'` (capture) or `kind = 'note'` (memory). |
| `FROM _ops.machines` | `mneme_reader` lacks USAGE on the `_ops` schema — `permission denied for schema _ops`. | Use the public `machines` view: `FROM machines` (no schema qualifier needed). |

---

## Privacy and filters

| Mistake | Why it fails | Fix |
|---|---|---|
| `WHERE private = false` | Reader role's RLS already enforces this physically. Adding the filter is redundant and confuses the query plan. | Don't add it. The role can't see `private = true` rows. |
| Adding `WHERE machine_id = '...'` to find "my" memories | If you don't already know your `machine_id`, this filter pre-filters to nothing. | Resolve via `machines` first (`SELECT machine_id FROM machines WHERE name = 'macbook.pro' AND revoked_at IS NULL`), OR drop the filter entirely (cross-machine recall is the default). |

---

## Workflow anti-patterns

| Mistake | Why it fails | Fix |
|---|---|---|
| Fetching full `content` in Layer 1 | Wastes tokens on rows you'll discard. | Always preview-only (`substring(content, 1, 200)`); unfold only the IDs you keep. |
| Loading `references/*.md` up front | Bloats context for simple recall. | Stick to [`../SKILL.md`](../SKILL.md) for common cases; load a reference only when the question genuinely matches its scope. |
| Walking 2+ hops on `related_to` | Returns ~25 memories with diluted relevance. | One hop is enough. If you need broader context, search semantically again with a different phrasing. |
| Starting at a superseded row | You'll narrate stale truth. | Walk `meta.superseded_by` forward to current truth before reading the content. |
| Re-clustering manually | `meta.in_cluster` is sticky by design. Only the digest worker can re-point it. | If a cluster looks wrong, file an issue — don't try to "fix" it via SQL. |

---

## Missing-data fallbacks

| Symptom | Likely cause | Fix |
|---|---|---|
| `memories` query returns 0 rows but you know the user discussed it | Extractor / embedder hasn't processed the captures yet (fresh corpus, daemon down) | Fall back to `captures.content ILIKE` — see [`recipes.md`](./recipes.md) "Captures fallback". |
| `ts_rank(...) = 0` for every row | The query has no token overlap with `content`. Fix is on the search side, not the schema. | Drop the BM25 term and rely on cosine alone. Or rephrase the query. |
| Cosine similarity returns the same top-1 for every query | The embedder is returning a constant or near-constant vector. Check daemon logs. | Not solvable from `mneme_sql`. Mention to the user; don't paper over it. |

---

## SQL syntax gotchas

| Mistake | Why it fails | Fix |
|---|---|---|
| Single quotes in query text not escaped | `embed('it's broken')` parses as two strings. | Double the inner quote: `embed('it''s broken')`. Or use `$$` quoting: `embed($$it's broken$$)`. |
| `meta.related_to` instead of `meta->'related_to'` | Postgres jsonb access uses `->` (jsonb) or `->>` (text). | `meta->'related_to'` returns jsonb array; `meta->>'in_cluster'` returns text. |
| `id IN (SELECT ...)` returning text vs uuid mismatch | `meta->>'in_cluster'` is text; `id` is uuid. | Cast: `id::text = meta->>'in_cluster'` OR `(meta->>'in_cluster')::uuid = id`. |
| Forgetting `archived_at IS NULL` | Returns archived rows alongside live ones. | Almost every query should include `WHERE archived_at IS NULL`. |
| Multiple statements in one call | Tool rejects with "single statement only". | Run as separate `mneme_sql` calls. |

---

## What to do when stuck

1. Re-read [`schema.md`](./schema.md) to confirm columns exist on the right table.
2. Run a tiny sanity-check query first: `SELECT count(*) FROM memories WHERE archived_at IS NULL;`. If that's 0, the corpus is empty.
3. Drop filters one at a time. The most-restrictive filter is usually the culprit.
4. If the user asked about a specific session/repo/machine, verify it exists: `SELECT DISTINCT repo FROM captures LIMIT 50;`.
