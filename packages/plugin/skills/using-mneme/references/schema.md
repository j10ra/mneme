# Schema reference

Column types, jsonb shapes, and the source taxonomy. Load when you need to construct a query and want to verify a column exists or check its shape.

> Load when: you're about to write SQL and need column types or jsonb keys. Don't load this just to do a basic recall — the 3-layer workflow in [`../SKILL.md`](../SKILL.md) tells you everything you need for the common case.
> See also: [`mistakes.md`](./mistakes.md) for the most common schema-confusion errors.

---

## `memories` — chunked, embedded, BM25-indexed

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `capture_id` | `uuid` FK → captures | |
| `chunk_id` | `text` UNIQUE | model-scoped: `sha256(content_hash + ":" + embedding_model)`. Re-embed under a new model produces fresh rows, doesn't overwrite. |
| `content` | `text` | the memory itself. For `kind='cluster'` rows, this is the LLM-distilled summary. |
| `content_hash` | `text` | sha256 of `content` |
| `embedding` | `vector(384)` | cosine via `<=>`. Use `embed('text')` macro to inject query vector. |
| `embedding_model` | `text` | model name from the embedder; varies by deployment |
| `tsv` | `tsvector` | for `ts_rank(tsv, websearch_to_tsquery('english', 'q'))` |
| `kind` | `text` | one of: `note`, `bugfix`, `feature`, `discovery`, `decision`, `preference`, `constraint`, `security_alert`, `reference`, `summary`, `cluster`. |
| `importance` | `real` | `[0.05, 1.0]` for unpinned, `[0.5, 1.0]` for pinned. Decays each nap cycle (every 4h, τ=30 days). |
| `recall_weight` | `real` | Use-driven reinforcement (LTP). Server bumps it on every successful `mneme_sql` access whose intent is clear: explicit UUIDs in WHERE, the `/recall` marker, or a narrowed ≤10-row query. Decays ×0.933 each nap cycle. Ranking adds `0.1 * ln(1 + recall_weight)`, so hot rows drift up without dominating. Filter/inspect freely; the server writes it for you. |
| `meta` | `jsonb` | see jsonb shapes below |
| `repo`, `machine_id`, `harness`, `agent`, `topics[]` | `text` / `text[]` | denormalised scope from capture |
| `private` | `bool` | RLS-blocked from the reader role. Don't filter on it — you can't see them anyway. |
| `created_at`, `archived_at` | `timestamptz` | filter `archived_at IS NULL` for alive rows |

### `meta jsonb` shapes

| Key | Type | Set by | Meaning |
|---|---|---|---|
| `pinned` | bool | `/mneme:pin` slash | surfaces in every session, exempt from clustering and supersede |
| `superseded_by` | uuid string | nap (rule) + dream/digest (LLM) | the newer memory (or, on a losing cluster row, the winning cluster) that replaced this row. Recall rank-down × 0.3 |
| `related_to` | uuid array | nap | bidirectional semantic neighbours (cosine < 0.15) |
| `in_cluster` | uuid string | dream | the `kind='cluster'` row this memory is a member of |
| `member_ids` | uuid array | dream | only on `kind='cluster'` rows — the constituents |
| `cluster_title` | string | dream | only on `kind='cluster'` rows — short label |
| `extractor_provider`, `extractor_model` | string | daemon extract | provenance |
| `distiller_provider`, `distiller_model` | string | daemon dream | provenance for cluster summaries |
| `last_napped_at` | timestamptz | nap | drives nap's round-robin pagination — don't filter on it manually |

---

## `captures` — raw, immutable

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `content` | `text` | scrubbed at edge for secrets and `<private>` blocks |
| `content_sha256` | `text` | dedup key — `UNIQUE (content_sha256, machine_id)` |
| `source` | `text` | event origin (see taxonomy below) |
| `repo`, `machine_id`, `hostname`, `harness`, `agent`, `session_id` | `text` | scope |
| `topics` | `text[]` | optional manual tags |
| `private` | `bool` | RLS-blocked from the reader role |
| `raw_meta` | `jsonb` | source-specific extras |
| `captured_at`, `created_at`, `archived_at` | `timestamptz` | `created_at` is a generated alias of `captured_at` — either works |

### `source` taxonomy

| `source` | Origin |
|---|---|
| `claude_hook` | UserPromptSubmit + PostToolUse (user prompts AND tool calls) |
| `claude_summary` | Stop / PreCompact session digests (full payload as JSON) |
| `claude_assistant` | Assistant turns transcribed from the session JSONL |
| `claude_memory` | Hook detected an auto-memory write to `~/.claude/projects/*/memory/*.md` |
| `pi_prompt`, `pi_assistant`, `pi_tool` | Pi harness analogs of the `claude_*` prompt/assistant/tool sources |
| `manual:/memory` | `/mneme:memory <text>` slash |
| `manual:/api/memory` | Direct memory write — `/mneme:pin <text>` (bypasses extract) |
| `manual` | pin / unpin / archive / supersede actuation captures |

`source` is the *event origin*. It is **not** the same as `memories.kind`. Don't write `WHERE source = 'note'` — that's a kind, not a source.

---

## `machines` — name → machine_id (public view)

Read-only public view exposing `(machine_id, name, created_at, last_used_at, revoked_at)`. Backed by the curated `_ops.machines` projection over `_ops.api_keys`, but only the safe columns ship here — tokens and auth metadata stay invisible to `mneme_reader`.

| Column | Notes |
|---|---|
| `machine_id` | UUID — the canonical id used in `captures.machine_id` and `memories.machine_id` |
| `name` | Friendly name set at `/mneme:setup` time, mutable via `/mneme:rename` |
| `revoked_at` | NULL = active. A revoked-and-re-registered machine shows two rows; filter `revoked_at IS NULL` to pick the live one. |

Use the bare name `machines` (e.g. `SELECT name FROM machines WHERE machine_id = ...`). The underlying `_ops.machines` is **not** agent-visible — `mneme_reader` lacks USAGE on the `_ops` schema by design, so `FROM _ops.machines` returns `permission denied for schema _ops`.

