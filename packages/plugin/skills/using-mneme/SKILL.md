---
name: using-mneme
description: How to query Mneme — your cross-machine memory store. SQL-first via the mneme.sql tool. Use embed('text') for semantic search, ts_rank for keyword. Three tables (captures, memories, ingest_jobs). The embed() macro is auto-substituted with a 1024-dim vector from the configured embedder before execution. Surface rows show an [8-char id prefix] you can pivot from with `id::text LIKE '<prefix>%'`.
---

# Mneme: cross-machine memory via SQL

Mneme stores your memories in Postgres + pgvector. The agent talks to it through one tool: `mneme.sql(query)`. Read-only. SELECT only. Auto-`LIMIT 200`. 5s statement timeout. 1MB result cap.

## Schema

### `captures` — raw, immutable
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `content` | text | scrubbed at edge for secrets and `<private>` blocks |
| `content_sha256` | text | dedup key |
| `source` | text | `claude_hook`, `claude_summary`, `claude_assistant`, `claude_memory`, `manual:/memory`, `manual:/api/memory`. (Dream writes directly to `memories`, not through `/api/capture`, so no `dream` source on captures.) |
| `machine_id`, `hostname`, `repo`, `harness`, `agent`, `session_id` | text | scope |
| `topics` | text[] | optional tags |
| `private` | bool | true rows are invisible via `mneme.sql`. The MCP reader role has an RLS policy of `USING (private = false)`, so private rows are physically unreachable from this tool — no `WHERE private = false` is needed and no filter you write can surface them. The SessionStart surface uses a separate server-side path that applies a machine-aware filter. |
| `raw_meta` | jsonb | source-specific extras |
| `captured_at`, `archived_at` | timestamptz | |
| `UNIQUE(content_sha256, machine_id)` | | |

### `memories` — chunked, embedded, BM25-indexed
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `capture_id` | uuid FK | → captures |
| `chunk_id` | text UNIQUE | composite hash; encodes embedding model so re-embed is safe |
| `content` | text | |
| `content_hash` | text | |
| `embedding` | vector(1024) | populated by the configured embedder provider |
| `embedding_model` | text | model name from the embedder; varies by deployment. `chunk_id = sha256(content_hash + ":" + embedding_model)` so re-embedding under a different model produces fresh rows instead of overwriting. |
| `tsv` | tsvector | for `ts_rank`, `websearch_to_tsquery` |
| `kind` | text | one of: `note`, `bugfix`, `feature`, `discovery`, `decision`, `preference`, `constraint`, `security_alert`, `reference`, `summary`, `cluster`. (`claude_memory` is a *source* on captures, not a kind on memories. `pin` is a `raw_meta.kind` flag used to actuate `meta.pinned` — also not a memory kind.) |
| `importance` | real | decays over time (nap), boosts on reference |
| `meta` | jsonb | `related_to`, `member_ids`, `superseded_by`, `shadow_of`, `pinned`, `one_line` |
| same scope cols | | denormalized from capture |

### `ingest_jobs` — worker queue
You usually don't query this. `phase` ∈ `extract`, `embed`, `dream`. `state` ∈ `queued`, `running`, `done`, `error`.

### `machines` — name → machine_id lookup (view)
Read-only view exposing the `(machine_id, name, created_at, last_used_at, revoked_at)` mapping that lives in `_ops.api_keys`. Use this whenever the user refers to a machine by its friendly name ("get recent conversation from qube-laptop"): resolve the name to a `machine_id` first, then query `captures` / `memories`.

```sql
-- Resolve "qube-laptop" → machine_id, then pull recent captures
WITH m AS (
  SELECT machine_id FROM machines
  WHERE name = 'qube-laptop' AND revoked_at IS NULL
  LIMIT 1
)
SELECT c.captured_at, c.source, substring(c.content, 1, 200) AS preview
FROM captures c, m
WHERE c.machine_id = m.machine_id
  AND c.archived_at IS NULL
ORDER BY c.captured_at DESC
LIMIT 20;
```

If `name = '<exact>'` returns nothing, fall back to `name ILIKE '%<fragment>%'`. A machine that's been renamed in place stays the same `machine_id` (its captures don't bifurcate); a machine that was revoked + re-registered shows two rows here.

### Common mistakes (READ THIS BEFORE WRITING SQL)

These are real failure patterns observed in production. Don't repeat them:

| Mistake | Why it fails | Fix |
|---|---|---|
| `SELECT title FROM ...` | No `title` column exists on any table | Memory/capture content is in `content`. Cluster summaries also use `content`. |
| `FROM observations` | No `observations` table — that's claude-mem's schema, not Mneme | Use `memories` (chunked + embedded) or `captures` (raw events) |
| `captures.created_at` | `captures` uses **`captured_at`**; only `memories` uses `created_at` | Match the column to the table: captures → `captured_at`, memories → `created_at` |
| `captures.kind` / `captures.embedding` / `captures.tsv` | These columns are **only on `memories`**, not `captures` | If you need kind filtering / embeddings / BM25, you need the `memories` table. If `memories` is empty, fall back to keyword `ILIKE` on `captures.content` |
| `WHERE source = 'note'` | `source` is the *event source* (`claude_hook`, `claude_summary`, `manual:/memory`, etc.). `note` is a `kind`. | Use `kind = 'note'` on memories, or `source = 'manual:/memory'` on captures |

**Always read the schema table at the top of this skill before constructing a query.** Don't assume column names from other systems.

## Which table to query (read this before recalling)

The two real tables hold different things. Pick based on the user's intent:

| User intent | Query | Why |
|---|---|---|
| "What did we talk about?" / "show me recent conversation" / "what tools did Claude run?" / "what was I working on yesterday?" | `captures` | Raw record of prompts, tool calls, session summaries. No processing required, always present. |
| "Find me memories about X" / "what's our decision on Y?" / semantic recall | `memories` | Chunked + embedded + kind-tagged. Use the `embed()` macro for cosine similarity. |

**Fallback rule:** if a `memories` query returns 0 rows for a recall request, immediately re-run the recall against `captures` before reporting "no memories" to the user. Captures are the source-of-truth event log; memories are a synthesized index built on top.

### Recent conversation pattern (captures)

```sql
SELECT id, source, repo, machine_id, captured_at,
       substring(content, 1, 200) AS preview
FROM captures
WHERE archived_at IS NULL
  AND captured_at > now() - interval '24 hours'
  -- optional: AND repo = '<canonical-repo>'
ORDER BY captured_at DESC
LIMIT 20;
```

The `source` column tells you what kind of event:
- `claude_hook` — a prompt the user typed OR a tool call the agent made (UserPromptSubmit + PostToolUse)
- `claude_summary` — Stop / PreCompact session digest (full payload as JSON)
- `claude_assistant` — assistant turns transcribed from the session JSONL
- `claude_memory` — auto-memory write detected by the hook on `~/.claude/projects/*/memory/*.md`
- `manual:/memory` — explicit `/mneme:memory` slash command
- `manual:/api/memory` — direct memory write (used by `/mneme:pin <text>`, which bypasses the extract worker)

For "what did the user say" specifically, filter on `source = 'claude_hook'` and look at `content` — user prompts are short text, tool calls are JSON beginning with `{"tool":...}`. For "what did the agent say back," filter on `source = 'claude_assistant'`.

## The `embed()` macro

Inside any SELECT, `embed('your query text')` is replaced with a 1024-dim vector from the configured embedder before execution. Use with `<=>` (cosine distance):

```sql
SELECT id, content, 1 - (embedding <=> embed('payment integration')) AS sim
FROM memories
ORDER BY sim DESC
LIMIT 10;
```

## Default hybrid recall

Copy and adapt:

```sql
SELECT id, content, kind, repo, importance, created_at
FROM memories
WHERE archived_at IS NULL
  AND (meta->>'shadow_of') IS NULL
  AND (meta->>'superseded_by') IS NULL
ORDER BY
  0.6 * (1 - (embedding <=> embed('your query'))) +
  0.4 * ts_rank(tsv, websearch_to_tsquery('english', 'your query'))
DESC
LIMIT 10;
```

## Common patterns

**Decisions in current repo:**
```sql
SELECT id, content, created_at FROM memories
WHERE kind = 'decision' AND repo = '<canonical-git-url>'
  AND archived_at IS NULL
ORDER BY importance DESC, created_at DESC LIMIT 10;
```

**Recent across all machines (last week):**
```sql
SELECT id, content, machine_id, created_at FROM memories
WHERE created_at > now() - interval '7 days'
  AND archived_at IS NULL
ORDER BY created_at DESC LIMIT 20;
```

**Unfold one memory by id:**
```sql
SELECT * FROM memories WHERE id = '<uuid>';
```

**Pivoting from a surface row** — the SessionStart surface (the markdown that lands in your context at session start) prefixes every line with an 8-char hex id and a kind glyph, e.g.:

```
- [a3f29c7d] ⚖️ 0.90 Use the local LLM provider for extraction
- [c4f2a1b9] 5d ago · 🔴 Pin actuation needed UUID validation
```

To fetch the full memory + related context for one of those rows, match the prefix:

```sql
SELECT id, content, kind, importance, repo, machine_id,
       meta->'related_to' AS related_ids,
       meta->>'in_cluster' AS in_cluster,
       meta->>'shadow_of' AS shadowed_by
FROM memories
WHERE id::text LIKE 'a3f29c7d%'
  AND archived_at IS NULL
LIMIT 1;
```

The 8-char prefix is unambiguous at personal scale. If you want the cluster summary that contains a surface row, follow `meta.in_cluster`; for siblings, follow `meta.related_to`.

**Glyph legend** (for reading the surface):
🔴 bugfix · 🟣 feature · ⚖️ decision · 🔵 discovery · 💬 preference · 🚧 constraint · 🚨 security_alert · 📎 reference · 🎯 summary · 🧩 cluster · 🧠 claude_memory · 📝 note

**Cluster summaries only:**
```sql
SELECT id, content, meta->'member_ids' AS members, importance
FROM memories
WHERE kind = 'cluster' AND archived_at IS NULL
ORDER BY created_at DESC LIMIT 5;
```

**Backlinks (memories that reference this one):**
```sql
SELECT id, content FROM memories
WHERE meta->'related_to' ? '<target-uuid>';
```

**Recent sessions for a repo (cross-machine):**
```sql
SELECT session_id, machine_id, count(*) AS captures, max(captured_at) AS last_active
FROM captures
WHERE repo = '<canonical-git-url>' AND archived_at IS NULL
GROUP BY session_id, machine_id
ORDER BY last_active DESC LIMIT 10;
```

## Scope filtering

- `repo = '<canonical-git-url>'` — same repo across all machines (recommended default)
- `machine_id = '<uuid>'` — same machine only
- `archived_at IS NULL` — alive memories only (almost always include this)

Privacy is enforced at the role level — `mneme.sql` physically can't return rows with `private = true`. You don't need (and shouldn't add) a `private = false` filter in your queries.

## What the tool will *not* run

- `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `VACUUM`, `REINDEX`, `REFRESH`, `COPY`, `CALL`, `DO`, `EXECUTE`, `LOCK`, `MERGE`
- More than one statement per call
- The connection runs as `mneme_reader` which physically lacks write privileges

## Writing memories

Don't use `mneme.sql` for writes. Use the slash command `/memory <text>`, which POSTs to `/api/capture` with proper scrubbing, dedup, and job enqueuing. Hooks fire automatically during sessions.
