---
name: using-mneme
description: How to query Mneme — your cross-machine memory store. SQL-first via the mneme.sql tool. Use embed('text') for semantic search, ts_rank for keyword. Three tables (captures, memories, ingest_jobs). Default scope filters keep recall focused; the embed() macro is auto-substituted with a voyage-code-3 vector before execution.
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
| `source` | text | `claude_hook`, `claude_summary`, `claude_memory`, `manual`, `http`, `dream`, ... |
| `machine_id`, `hostname`, `repo`, `harness`, `agent`, `session_id` | text | scope |
| `topics` | text[] | optional tags |
| `private` | bool | true = origin-machine only on read |
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
| `embedding` | vector(1024) | voyage-code-3 |
| `embedding_model` | text | currently `voyage-code-3` |
| `tsv` | tsvector | for `ts_rank`, `websearch_to_tsquery` |
| `kind` | text | `note`, `bugfix`, `feature`, `discovery`, `decision`, `preference`, `constraint`, `security_alert`, `reference`, `summary`, `cluster`, `claude_memory`, `pin` |
| `importance` | real | decays over time (nap), boosts on reference |
| `meta` | jsonb | `related_to`, `member_ids`, `superseded_by`, `shadow_of`, `pinned`, `one_line` |
| same scope cols | | denormalized from capture |

### `ingest_jobs` — worker queue
You usually don't query this. `phase` ∈ `extract`, `embed`, `dream`. `state` ∈ `queued`, `running`, `done`, `error`.

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
- `claude_hook` — a prompt you typed OR a tool call Claude made
- `claude_summary` — Stop / PreCompact session digest (full payload as JSON)
- `claude_memory` — auto-memory write detected by the hook
- `manual:/memory` — explicit `/memory` slash command
- `manual` — `/pin`, `/unpin`, etc.

For "what did I say" specifically, filter on `source = 'claude_hook'` and look at `content` — your prompts are short text, tool calls are JSON beginning with `{"tool":...}`.

## The `embed()` macro

Inside any SELECT, `embed('your query text')` is replaced with a voyage-code-3 1024-dim vector before execution. Use with `<=>` (cosine distance):

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
- `(private = false OR machine_id = '<this-machine>')` — respect privacy
- `archived_at IS NULL` — alive memories only (almost always include this)

## What the tool will *not* run

- `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `VACUUM`, `REINDEX`, `REFRESH`, `COPY`, `CALL`, `DO`, `EXECUTE`, `LOCK`, `MERGE`
- More than one statement per call
- The connection runs as `mneme_reader` which physically lacks write privileges

## Writing memories

Don't use `mneme.sql` for writes. Use the slash command `/memory <text>`, which POSTs to `/api/capture` with proper scrubbing, dedup, and job enqueuing. Hooks fire automatically during sessions.
