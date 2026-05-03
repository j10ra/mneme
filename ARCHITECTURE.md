# Mneme — Architecture (v2)

> Greek muse of memory. A personal, cross-machine, cross-harness, cross-AI memory layer. Three tables. One SQL tool. A skill that teaches the agent how to walk the data.

---

## 1. Problem and Scope

### The pain
- **claude-mem** captures coding sessions richly, but is single-machine and never leaves the laptop.
- **OB1** is cross-AI and cross-machine via MCP, but has no hook surface — captures are manual.
- Switching machine, harness, or model loses context.

### What Mneme is
A personal tool for one user. Three machines. Multiple harnesses (Claude Code first-class, others via generic capture). Multiple AI providers. **Postgres + pgvector + tsvector** as the single source of truth, fronted by a one-tool MCP server and a skill that orients any agent to the data.

### What Mneme is not
- Multi-tenant.
- Team memory.
- A replacement for `git log` or your editor's history.

### Comparison with prior art

Mneme takes the best parts of four existing systems.

| Dimension | claude-mem | OB1 | memsearch | mempalace | **Mneme** |
|---|---|---|---|---|---|
| Primary purpose | Local coding session memory | Personal note hub via MCP | Markdown memory for coding agents | Local memory palace | Cross-machine coding memory across harnesses |
| Storage | SQLite + Chroma (local) | Supabase (Postgres + pgvector) | Markdown files + Milvus/Milvus-Lite | ChromaDB + SQLite KG (local) | Supabase (Postgres + pgvector + tsvector) |
| Capture | Hooks per event (PostToolUse, Stop, UserPromptSubmit) | Manual via MCP `capture_thought` | File watcher on markdown dir | Manual CLI passes | Hooks + slash + HTTP, coalesced server-side, urgent bypass |
| Cross-machine | ❌ single laptop | ✅ shared Supabase | ❌ local files | ❌ local | ✅ Supabase SoT |
| Cross-harness | Partial (writes only, local) | ✅ MCP-native | Partial (CC/Codex/OpenCode plugins) | ❌ Claude Code only | ✅ MCP + generic POST |
| Cross-AI | ❌ Claude only | ✅ any MCP client | Partial | ❌ | ✅ |
| Consolidation | ❌ none | ❌ none | Manual `compact` (single LLM pass) | Manual dedup CLI | Nightly **dream**: cluster + distill + supersede |
| Importance/decay | ❌ | ❌ | ❌ | ❌ | **Nap**: exp decay + shadows + relations |
| Contradiction | ❌ | ❌ | ❌ | Bitemporal triples (`valid_to`) | Bitemporal supersede via `meta.superseded_by` |
| Dedup | `UNIQUE(content_hash, session)` | SHA-256 fingerprint | composite chunk_id with model | cosine NN within source (destructive) | All four, additive |
| In-session surface | ✅ Per-folder CLAUDE.md regen | ❌ | ❌ | ❌ | ✅ SessionStart pointer list — no files written |
| Tool surface | 7+ specialized MCP tools | 3 MCP tools | Custom MCP tools | MCP server | One: `mneme.sql` + skill |
| Hook resilience | Always-on Bun daemon | n/a | File watcher | n/a | Local outbox + retry on next session |
| LLM in pipeline | Per-event secondary Claude (expensive) | Optional metadata at insert | One-shot compact | Optional Ollama refinement | Coalesced 5-min batches via cheap provider |
| Privacy | `<private>` tag stripping | Row-level security | none explicit | none explicit | Edge scrubber + `<private>` strip + `private` flag + paid-LLM only |
| License | AGPL-3.0 | FSL-1.1-MIT | Apache-2.0 | (varies) | Personal tool, unlicensed |

**What Mneme inherits from each:**

- **claude-mem:** rich kind taxonomy (`bugfix`/`feature`/`decision`/`security_alert`/...), in-session surface via SessionStart hook, hook-driven capture.
- **OB1:** Supabase + pgvector as cross-machine source of truth, MCP as the cross-AI unifier.
- **memsearch:** composite `chunk_id` with embedding model in the hash (safe re-embed migration), compact-as-new-file pattern (cluster summaries flow back as captures), hybrid dense + BM25.
- **mempalace:** bitemporal supersede (`valid_to` close-out, `superseded_by`), the never-DELETE principle, `NORMALIZE_VERSION` style invalidation.

---

## 2. Design Principles (locked)

1. **Three tables for v1.** Add a fourth only when an actual reader needs it. memsearch / mempalace shape: small surface, lots of derived behavior in functions and crons.
2. **SQL is the read interface.** One MCP tool: `mneme.sql(query)`. Read-only, with an `embed()` macro for vector search. The skill teaches the agent to write the queries.
3. **Captures are sacred.** Raw `captures` are immutable. All later phases are additive: new memory rows, updated `meta jsonb`, flipped `archived_at`. Bitemporal supersede via flags, never DELETE.
4. **Progressive disclosure in the skill.** Skill description loaded at session start (~50 tokens). Body loaded when the agent decides Mneme is relevant. No memory bodies ever auto-injected into the system prompt.
5. **Privacy at the edge.** `<private>` strip + secrets regex on every POST. Paid LLM providers only when extracting (no free tiers that train on prompts).

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Capture** | Raw immutable input event from a hook, slash command, or HTTP POST. |
| **Memory** | A chunk of a capture with embedding, tsv, kind, scope, and importance. Derived rows like cluster summaries are *also* memories — same table. |
| **Kind** | One of `note`, `bugfix`, `feature`, `discovery`, `decision`, `preference`, `constraint`, `security_alert`, `reference`, `summary`, `cluster`, `claude_memory`, `pin`. Extends claude-mem's observation taxonomy. |
| **Scope** | The (machine, repo, harness, agent, topic[]) tuple on every capture and memory. |
| **Importance** | Salience score. Decays with time, can be pinned. |
| **Embed macro** | `embed('text')` inside SQL. The MCP `sql` tool replaces it with a Voyage vector literal before execution. |
| **Nap** | Every 6 hours: decay importance, mark near-dups in `meta.related_to`. |
| **Dream** | Nightly: cluster recent memories per scope, LLM-distill into a `kind='cluster'` memory, supersede stale facts in `meta.superseded_by`. |
| **Surface** | Per-session injection of pinned + `preference`/`constraint` memories + recent cluster summaries via the harness's SessionStart hook stdout (claude-mem pattern). Never writes to `CLAUDE.md` or any user file. Token-capped, scoped to current repo. |
| **Bootstrap** | Lightweight session-start signal. `POST /api/session/start` returns ids only, 500ms cap. |
| **Urgent capture** | Kinds `security_alert`, `decision` skip the 5-min coalescing window and extract immediately. |

---

## 4. High-Level Architecture

```mermaid
flowchart TD
    subgraph Clients[Any machine, any harness]
        A1[Claude Code hooks]
        A2[Codex / Cursor / OpenCode hooks]
        A3[Manual /memory slash command]
        A4[Generic HTTP POST]
    end

    subgraph Edge[Capture surface]
        C[POST /api/capture<br/>fire-and-forget, fast]
        B[POST /api/session/start<br/>500ms cap]
    end

    subgraph Store[Supabase: single source of truth]
        DB[(Postgres + pgvector + tsvector<br/>3 tables)]
    end

    subgraph Workers[Always-on Railway worker + pg_cron]
        W1[Process: extract + embed + index]
        W2[Nap 6h: decay + near-dup]
        W3[Dream nightly: cluster + distill + supersede]
    end

    subgraph Read[MCP: one tool]
        M1[mneme.sql query<br/>read-only, embed macro]
    end

    subgraph Surface[Per-session surface]
        SF["api/session/start returns pointer list<br/>SessionStart hook prints to stdout<br/>harness prepends as additional context<br/>no files written"]
    end

    subgraph Skill[Skill: mneme:using-mneme]
        SK[Schema + patterns +<br/>when to use what]
    end

    subgraph Agents[Any AI agent]
        AG1[Claude Opus / Sonnet]
        AG2[GLM / GPT / Llama / Qwen]
    end

    A1 & A2 & A3 & A4 --> C
    A1 --> B
    C --> DB
    B --> DB
    DB <--> W1
    DB <--> W2
    DB <--> W3
    DB <--> M1
    DB --> SF
    SF -.writes.-> A1
    AG1 & AG2 --> M1
    AG1 & AG2 -.reads.-> SK

    classDef store fill:#064e3b,stroke:#10b981,color:#fff
    classDef worker fill:#7c2d12,stroke:#f59e0b,color:#fff
    classDef read fill:#1e3a8a,stroke:#3b82f6,color:#fff
    classDef edge fill:#581c87,stroke:#a855f7,color:#fff
    classDef skill fill:#3b0764,stroke:#c084fc,color:#fff
    classDef surface fill:#7f1d1d,stroke:#fca5a5,color:#fff
    class DB store
    class W1,W2,W3 worker
    class M1 read
    class C,B edge
    class SK skill
    class SF surface
```

### Stack

| Layer | Choice | Cost (personal) |
|---|---|---|
| Storage | Supabase (Postgres + pgvector + tsvector) | Free tier |
| Embeddings | Voyage-code-3 (1024-dim, free tier 200M tokens/mo) | $0 |
| LLM (extract + distill) | **TBD at Phase 4**: Groq free OR Ollama local OR OpenRouter paid | $0-4/mo |
| Worker host | Railway Hobby | $5/mo |
| Read interface | MCP (one tool) + a skill | included |
| **Total** | | **~$5-9/mo** |

---

## 5. Data Model

### Three tables

```mermaid
erDiagram
    captures ||--o{ memories : "chunked into"
    captures ||--o{ ingest_jobs : "queued for"

    captures {
        uuid id PK
        text content
        text content_sha256
        text source
        text machine_id
        text hostname
        text repo
        text harness
        text agent
        text session_id
        text_array topics
        bool private
        jsonb raw_meta
        timestamptz captured_at
        timestamptz archived_at
    }

    memories {
        uuid id PK
        uuid capture_id FK
        text chunk_id UK
        text content
        text content_hash
        vector embedding
        text embedding_model
        tsvector tsv
        text kind
        real importance
        text machine_id
        text repo
        text harness
        text agent
        text_array topics
        bool private
        jsonb meta
        timestamptz created_at
        timestamptz archived_at
    }

    ingest_jobs {
        uuid id PK
        uuid capture_id FK
        text phase
        text state
        int attempts
        text error
        timestamptz scheduled_at
        timestamptz started_at
        timestamptz finished_at
    }
```

### What lives in `meta jsonb` instead of dedicated tables

| Use | Stored as |
|---|---|
| Near-dup links | `meta.related_to`: `["<id>", "<id>", ...]` |
| Cluster membership (on a `kind='cluster'` row) | `meta.member_ids`: `["<id>", ...]` |
| Bitemporal supersede | `meta.superseded_by`: `"<id>"` on the older memory |
| Pinned by user | `meta.pinned`: `true` |
| Source coalescing window | `meta.coalesced_from`: `["<capture_id>", ...]` |
| Future shape | We add typed columns or a fourth table only when a reader needs them. |

### Schema DDL

```sql
-- ============================================================
-- Mneme schema v1: three tables. Additive forever.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------
-- captures: raw, immutable. sha256 dedup at ingest. Never updated.
-- ----------------------------------------------------------------
CREATE TABLE captures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content         TEXT NOT NULL,
  content_sha256  TEXT NOT NULL,
  source          TEXT NOT NULL,            -- 'claude_hook' | 'codex_hook' | 'cursor_hook' | 'manual' | 'http' | 'dream'
  machine_id      TEXT NOT NULL,            -- uuid string from ~/.mneme/machine.uuid
  hostname        TEXT NOT NULL,
  repo            TEXT,                     -- canonical git remote URL or NULL
  harness         TEXT NOT NULL,            -- 'claude-code' | 'codex' | 'cursor' | 'web' | 'cli'
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

-- ----------------------------------------------------------------
-- memories: chunked, embedded, BM25-indexed.
-- chunk_id encodes embedding model -> safe re-embed migration.
-- Cluster summaries are also memories (kind='cluster').
-- ----------------------------------------------------------------
CREATE TABLE memories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id       UUID NOT NULL REFERENCES captures(id),
  chunk_id         TEXT NOT NULL UNIQUE,      -- sha(source:start:end:content_hash:embedding_model)[:16]
  content          TEXT NOT NULL,
  content_hash     TEXT NOT NULL,
  embedding        VECTOR(1024),
  embedding_model  TEXT NOT NULL,
  tsv              TSVECTOR,
  kind             TEXT,                      -- see Glossary
  importance       REAL NOT NULL DEFAULT 1.0,

  -- denormalized scope for fast filter
  machine_id       TEXT NOT NULL,
  repo             TEXT,
  harness          TEXT NOT NULL,
  agent            TEXT,
  topics           TEXT[] NOT NULL DEFAULT '{}',
  private          BOOLEAN NOT NULL DEFAULT false,

  meta             JSONB NOT NULL DEFAULT '{}',  -- related_to, member_ids, superseded_by, pinned, ...

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at      TIMESTAMPTZ
);

CREATE INDEX memories_embedding_idx  ON memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX memories_tsv_idx        ON memories USING gin (tsv);
CREATE INDEX memories_repo_idx       ON memories (repo)       WHERE archived_at IS NULL;
CREATE INDEX memories_kind_idx       ON memories (kind)       WHERE archived_at IS NULL;
CREATE INDEX memories_importance_idx ON memories (importance DESC) WHERE archived_at IS NULL;
CREATE INDEX memories_meta_idx       ON memories USING gin (meta);   -- enables related_to / superseded_by lookups

-- ----------------------------------------------------------------
-- ingest_jobs: worker queue.
-- ----------------------------------------------------------------
CREATE TABLE ingest_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id    UUID REFERENCES captures(id),  -- NULL for cron-driven dream jobs
  phase         TEXT NOT NULL,                  -- 'extract' | 'embed' | 'dream'
  state         TEXT NOT NULL,                  -- 'queued' | 'running' | 'done' | 'error'
  attempts      INT NOT NULL DEFAULT 0,
  error         TEXT,
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ
);

CREATE INDEX ingest_jobs_pending_idx
  ON ingest_jobs (scheduled_at)
  WHERE state IN ('queued', 'error');
```

---

## 6. Lifecycle Flows

### 6.1 Capture (write)

All write paths converge on `POST /api/capture`. The endpoint is source-agnostic — it scrubs, hashes, dedups, and enqueues.

```mermaid
sequenceDiagram
    participant Src as Hook / Slash / HTTP
    participant API as POST /api/capture (Railway)
    participant DB as Postgres
    participant Q as ingest_jobs

    Src->>API: { content, source, kind?, machine_id, repo, harness, agent, session_id, private, urgent? }
    API->>API: scrub secrets, strip <private>, hash content
    API->>DB: INSERT INTO captures (sha conflict-do-nothing)
    DB-->>API: capture_id
    API->>Q: enqueue extract + embed (urgent bypasses coalescing)
    API-->>Src: 200 OK { id }
```

**SLA:** P95 < 200 ms. Captures never block the user. If the server is unreachable, the source writes to `~/.mneme/outbox/` and retries at next session start.

**Sources** (all hit the same endpoint):

| Source | Trigger | Default `kind` | Notes |
|---|---|---|---|
| `claude_hook` | Claude Code `PostToolUse`, `UserPromptSubmit` | (extracted in Process) | Coalesced by `session_id` 5-min window |
| `claude_summary` | Claude Code `Stop` and `PreCompact` hooks | `summary` | Session digest from the harness; skips coalescing |
| `claude_memory` | Claude Code `PostToolUse` matcher `Write|Edit` on path `~/.claude/projects/*/memory/*.md` | `claude_memory` (sub-type from frontmatter `type:` in `meta.original_type`) | Mirrors Anthropic auto-memory writes into Mneme |
| `manual:/memory` | `/memory <text>` slash command | `note` (or detected) | Importance floor 2.0 |
| `manual:/summarise` | `/summarise [<scope>]` slash command | `summary` | Optional scope arg (repo/topic); triggers a one-shot LLM summary of recent in-scope memories, stored as a new capture |
| `codex_hook` / `cursor_hook` | harness-native hooks | `note` (or extracted) | Phase 8 |
| `http` | direct POST from any tool | as supplied | Generic, documented |
| `dream` | Dream worker | `cluster` | Cluster summary flowed back as a capture (memsearch pattern) |

**Urgent bypass:** captures with `kind ∈ {security_alert, decision}` or with explicit `urgent: true` skip the 5-min coalescing window in Process and are extracted immediately.

**Slash command implementations** (all client-side wrappers around `POST /api/capture`):

- `/memory <text>` — write user-authored memory.
- `/summarise [<scope>]` — request an on-demand summary of recent in-scope memories. Slash command POSTs an empty capture with `source='manual:/summarise'` and a scope hint; the worker handles the summary generation as a normal Process job and stores result with `kind='summary'`.
- `/pin <id>` / `/unpin <id>` — POST `{source: 'manual', kind: 'pin', meta: {target: id, value: true|false}}`. Worker flips `meta.pinned` on the target memory.

### 6.2 Process (async per coalesced batch)

```mermaid
sequenceDiagram
    participant Worker
    participant DB as Postgres
    participant LLM as TBD (Groq/Ollama/OpenRouter)
    participant Voyage

    Worker->>DB: SELECT captures coalesced by session_id within 5min
    Worker->>LLM: extract structured observation<br/>(kind, summary, chunks[])
    LLM-->>Worker: { kind, summary, chunks[] }
    Worker->>Voyage: embed batch
    Voyage-->>Worker: vectors
    Worker->>DB: INSERT memories (chunk_id, embedding, tsv, kind, importance, meta.coalesced_from)
    Worker->>DB: UPDATE ingest_jobs SET state='done'
```

**Coalescing rule:** captures with the same `session_id` arriving within a 5-minute window are batched into one extraction. This is the key cost lever vs claude-mem's per-event extraction.

### 6.3 Nap (every 6h, pg_cron, pure SQL)

What it does, in plain language:
- **Decay:** every memory's `importance` shrinks by age (exp decay, τ = 30 days).
- **Pin floor:** memories with `meta.pinned = true` stay above a floor.
- **Exact-text shadows:** memories sharing `content_hash` keep the highest-importance one; the rest get `meta.shadow_of = <kept_id>` and importance hard-decayed.
- **Semantic relations:** memories within cosine 0.15 of each other (same scope) record each other in `meta.related_to`.

```mermaid
flowchart LR
    A[pg_cron 6h] --> B[Decay:<br/>importance *= exp -dt/30d<br/>WHERE NOT pinned]
    A --> C[Shadows:<br/>group by content_hash, keep max importance,<br/>others -> meta.shadow_of]
    A --> D[For each memory in last 7 days:<br/>cosine NN within same repo, distance < 0.15]
    D --> E[meta.related_to append]
```

Implementation: one SQL function `mneme.nap()` invoked by pg_cron. No LLM in the loop. See §6.7 for how shadows/related_to/superseded_by interact at recall time.

### 6.4 Dream (nightly, pg_cron + worker)

What it does:
- **Cluster:** group recent memories per repo by embedding similarity.
- **Distill:** for each cluster of 3+, LLM produces title + summary.
- **Persist:** insert as a new `memories` row with `kind='cluster'`, `meta.member_ids=[...]`. The cluster summary is itself a memory and shows up in `mneme.search` like any other.
- **Supersede:** if a cluster's summary contradicts a prior `kind='decision'` or `kind='preference'` in the same scope, mark the older memory `meta.superseded_by = <new_id>` and decay it.

```mermaid
flowchart TD
    A[pg_cron 02:00 UTC] --> B[INSERT ingest_jobs phase='dream']
    B --> C[Worker picks up job]
    C --> D[Pull memories from last 7 days, group by repo]
    D --> E[For each group: cosine-NN graph + connected components<br/>or HDBSCAN client-side]
    E --> F{Cluster size >= 3?}
    F -- yes --> G[LLM distill: title + 200-token summary]
    F -- no --> H[Skip]
    G --> I[INSERT memories kind='cluster',<br/>embedding, tsv, meta.member_ids]
    G --> J[Detect supersede:<br/>same kind+repo+similar topic, newer fact]
    J --> K[UPDATE older memory meta.superseded_by = new_id,<br/>importance *= 0.3]
```

**Why this is enough:** the cluster summary is a normal `memories` row. The next `/recall` query finds it via the same hybrid search as raw memories — and because it's distilled, it scores higher on relevance for broad queries while raw captures still rank for specific ones. memsearch's "compact-as-a-new-file" pattern, applied to rows.

### 6.5 Recall (read, via `mneme.sql`)

The MCP server exposes one tool, `mneme.sql(query)`. Before executing, the server scans the SQL for `embed('text')` calls, embeds each via Voyage, and substitutes the vector literal. Then it executes against a read-only Postgres role with timeout and result-size caps.

```mermaid
sequenceDiagram
    participant Agent
    participant MCP as mneme.sql
    participant V as Voyage
    participant DB as Postgres (ro role)

    Agent->>MCP: SELECT id, content<br/>FROM memories<br/>ORDER BY embedding <=> embed('payment integration')<br/>LIMIT 10
    MCP->>V: embed("payment integration")
    V-->>MCP: vector
    MCP->>MCP: substitute embed(...) -> '[0.12, ...]'::vector
    MCP->>DB: rewritten SELECT
    DB-->>MCP: rows
    MCP-->>Agent: result set
```

**Default hybrid recall** (the skill teaches this template):

```sql
SELECT id, content, kind, repo, captured_at := created_at, importance,
       0.6 * (1 - (embedding <=> embed($1))) +
       0.4 * ts_rank(tsv, websearch_to_tsquery('english', $1)) AS score
FROM memories
WHERE archived_at IS NULL
  AND (private = false OR machine_id = $2)
  AND (meta->>'superseded_by') IS NULL
ORDER BY score DESC
LIMIT 10;
```

The `/recall <query>` slash command runs this template, parameterized.

### 6.6 Surface — `POST /api/session/start` (pointer endpoint)

`POST /api/session/start` is a generic endpoint that returns a compact pointer list for a `(repo, machine_id)` scope. Any caller can hit it: a SessionStart hook prints the response to stdout, an MCP server can prepend it as a system preamble to the first response, a CLI can render it. **It is not Claude-Code-specific.**

**Cross-machine join:** `repo` is the canonical join key. A request with `{ repo: 'github.com/jalipalo/Mneme', machine_id: '<B>' }` aggregates pinned memories, preferences, constraints, recent clusters, and recent **sessions** from **all machines** that have ever worked on that repo. `machine_id` is used only to filter `private = true` memories (those return only to their origin machine).

**Request:**
```json
{ "machine_id": "<uuid>", "repo": "<canonical_url>", "session_id": "<harness_session>" }
```

**Response (text/markdown, ~1500 token cap):**

```markdown
# Mneme — github.com/jalipalo/Mneme · 12 memories · last active 2h ago (machine-A)

## Pinned & Rules
[abc123] pinned constraint :: Capture endpoint must respond in <200ms regardless of LLM state
[def456] pinned preference :: Use kebab-case for file names
[ghi789] preference :: Prefer explicit return types over inference in TS public APIs
[jkl012] decision :: Use OpenRouter paid only when extracting

## Recent themes
[mno345] cluster (47 members) :: Mneme architecture v2 — 3 tables, one MCP tool
[pqr678] cluster (12 members) :: Worker LLM choice deferred to Phase 4

## Recent sessions (this repo, all machines)
[sess:2026-04-26T08:14Z@machine-A · 47 captures · 3h2m] :: embedding pipeline and Voyage integration
[sess:2026-04-25T19:30Z@machine-B · 12 captures · 1h4m] :: schema simplification, killed cluster_members table
[sess:2026-04-25T11:02Z@machine-A · 23 captures · 2h11m] :: dream worker design, contradiction model

Call `mneme.sql` with an id (or session id) to unfold.
```

**What goes in each section:**

| Section | Source | Filter |
|---|---|---|
| Pinned & Rules | `memories` | `meta.pinned = true` OR (`kind ∈ {preference, constraint, decision}` AND `importance > threshold`), scope = repo, all machines |
| Recent themes | `memories` | `kind = 'cluster'` ordered by `created_at DESC`, top 3, scope = repo |
| Recent sessions | aggregate over `captures` | `repo = ?`, group by `session_id` + `machine_id`, ordered by `max(captured_at) DESC`, top 5. Title = latest `kind='summary'` capture for that session_id, fallback to "<n captures>". |

**Pointer row format:** `[<id>] <kind, flags> :: <one_line>`. `one_line` is `meta.one_line` if set, else the first ~100 chars of `content`. Session pointers use `[sess:<timestamp>@<machine>]` so the agent can `mneme.sql` for the full session digest.

**Token budget:** ~1500 cap. If exceeded, drop lower-importance pointers first; never truncate mid-row.

```mermaid
sequenceDiagram
    participant Caller as Hook / MCP / CLI
    participant API as POST /api/session/start
    participant DB as Postgres

    Caller->>API: { machine_id, repo, session_id }  [3s timeout, fail-empty]
    API->>DB: pinned + rules + recent clusters + session aggregates,<br/>scope=repo (cross-machine), private filtered by machine_id
    DB-->>API: ranked rows
    API->>API: render pointer list, cap tokens
    API-->>Caller: 200 text/markdown
```

**Callers:**
- Claude Code SessionStart hook — prints stdout (harness prepends as additional context)
- Codex / Cursor / OpenCode — first `mneme.sql` response from MCP prepends it as preamble
- CLI `mneme surface` — prints to terminal (manual check)
- Any HTTP client

### 6.7 Dedup is additive (lives in ingest, nap, dream)

Captures are immutable. Dedup is additive: nothing is ever deleted; rows get flags or shadows that change how they surface.

Three layers, in order of strictness:

1. **Ingest dedup (hard).** `UNIQUE (content_sha256, machine_id)` on `captures`. Posting the same content twice from one machine produces one row. Same content from two different machines produces two rows (correctly — they happened in two contexts). Composite `chunk_id` on `memories` rejects exact re-chunks under the same embedding model.
2. **Nap dedup (additive, soft).** Every 6h, near-duplicate detection:
   - **Exact-text shadows:** memories with the same `content_hash` get the lower-importance ones flagged `meta.shadow_of = <kept_id>`, importance hard-decayed. Default queries filter shadows.
   - **Semantic relations:** memories with cosine distance < 0.15 in the same scope record each other in `meta.related_to`. Not dedup, but lets recall collapse near-duplicates at query time ("don't return both if their related_to overlap").
3. **Dream dedup (additive, semantic).** Nightly clustering produces `kind='cluster'` summaries. Member memories aren't deleted; their importance fades relative to the summary. The cluster summary outranks them in default recall for broad queries, while raw memories still rank for specific ones. Dream also writes `meta.superseded_by` for explicit contradictions (same `kind`, same scope, newer fact contradicts older).

**Net effect at recall time:** the default hybrid query in the skill includes:

```sql
WHERE archived_at IS NULL
  AND (meta->>'shadow_of') IS NULL
  AND (meta->>'superseded_by') IS NULL
```

So shadows and superseded entries are invisible by default but recoverable by an explicit query (`WHERE meta->>'shadow_of' IS NOT NULL`).

**Why never DELETE:**
- Every "dedup" decision is a guess. Hard delete forecloses on ever revisiting it.
- Importance + shadow flags + superseded flags give us the same retrieval behavior as DELETE, with full reversibility.
- The cost (extra rows in Postgres) is trivial at personal scale.

This is the bitemporal pattern from mempalace: `valid_to` close-out beats `DELETE FROM`, every time.

---

## 7. Scope Model

Every capture and memory carries:

| Field | Source | Example |
|---|---|---|
| `machine_id` | `~/.mneme/machine.uuid` (created at install) | `b3e2...` |
| `repo` | `git remote get-url origin` canonicalized, or `NULL` | `github.com/jalipalo/Mneme` |
| `harness` | hook config | `claude-code` |
| `agent` | from session env or hook payload | `claude-opus-4-7` |
| `topics[]` | optional manual tags | `["payments", "auth"]` |
| `private` | `<private>...</private>` tag detected | `true` |

### Default rank (the skill's `/recall` template)

```
score = 0.6 * vector_similarity + 0.4 * bm25
        # then in WHERE clause: same-repo first, latest-wins via not-superseded
```

The skill encourages adding repo filters explicitly:
- "in this repo" → `WHERE repo = current_setting('mneme.repo')`
- "across all my work" → no repo filter
- "this week" → `AND created_at > now() - interval '7 days'`

### Cross-machine privacy

`private = true` memories are returned only when the request's `machine_id` matches `memories.machine_id`. Enforced in the default `WHERE` clause the skill teaches.

---

## 8. Privacy and Security

| Layer | Control |
|---|---|
| Edge scrubber | regex strip secrets (AWS keys, GitHub PATs, OpenAI/Anthropic/Groq/Voyage keys, JWT, Bearer tokens, SSH keys) before INSERT |
| Tag stripping | `<private>...</private>` content removed at edge |
| **Hook hard blacklist** | Hooks short-circuit before any HTTP call when `cwd` matches `/.claude/`, `/tmp/`, `/var/tmp/`, `/private/var/folders/`, `/proc/`, `/sys/`. Catches ghost-agent activity (e.g., claude-mem observer subagents). |
| **Hook tool-name blacklist** | `TodoWrite`, `Skill`, `Task*`, `EnterPlanMode`, `AskUserQuestion`, `ListMcpResourcesTool`, anything matching `/mneme/i` or `/claude.?mem/i` — drops meta-tool noise and breaks the "agent recalls Mneme → that recall becomes a memory" loop. |
| **Hook project allowlist** | `~/.mneme/config.json` `projects[]` array; any non-`SessionStart` event with a `cwd` outside a registered project root is rejected. `SessionStart` auto-registers the cwd if it passes the hard blacklist. Defends against subprocess Claude Code instances spawned by other plugins. |
| LLM provider | when paid: `data_collection: "deny"`. Free tiers banned for capture content. |
| Embeddings | Voyage (no training on content per ToS) |
| Auth | Bearer tokens in `Authorization` header, per-machine + scoped + revocable. Plaintext only on issuing machine in `~/.mneme/config.json`; server stores `sha256` hash only. See §9.5 for full mechanism. |
| DB role | MCP `sql` tool connects as `mneme_reader` (SELECT-only on the schema). Writes never go through SQL. |
| SQL safety | server rejects DML/DDL by parser, injects `LIMIT` if missing, 5s query timeout, 1MB result cap |
| Transport | HTTPS only |
| Local outbox | hooks write to `~/.mneme/outbox/` if server unreachable |

---

## 9. Service Shape and Observability

### 9.1 One service, many routes

Mneme runs as a **single Hono service** on Railway. The MCP endpoint is one route among several, not a separate service. Every external caller (hooks, slash commands, CLI, MCP clients, generic HTTP) talks to the same process. Internal calls between handlers are in-process function calls (no HTTP hop).

**URL namespaces:**
- `/api/*` — application HTTP API (write + read against Mneme data).
- `/mcp` — MCP protocol surface, kept flat by convention so MCP clients see a stable URL.
- `/health` — infra liveness, kept flat for monitoring tools.

| Route | Method | Type | Auth | Required scope | Source tag | Purpose |
|---|---|---|---|---|---|---|
| `/api/capture` | POST | **write** | Bearer | `capture` | `<source>` from body | All writes (hooks, slash, CLI, HTTP, dream worker) |
| `/api/session/start` | POST | read | Bearer | `read` | `mcp` / `hook` / `cli` | Pointer-list endpoint (§6.6) |
| `/mcp` | POST | read | Bearer | `mcp` | `mcp` | MCP HTTP transport for `mneme.sql` (read-only) |
| `/health` | GET | read | none | — | `infra` | Liveness |
| `/internal/*` | — | n/a | n/a | n/a | n/a | Not exposed; cron + worker handlers, called in-process |

Auth + scope details in §9.5.

**Route ↔ route policy:**
- `/mcp` does **not** call `/api/capture`. MCP is read-only by design; writes always come from outside (a hook, a slash command, a CLI, an HTTP client) hitting `/api/capture` directly.
- The dream worker emits cluster summaries by calling its own `/api/capture` handler **as a function**, not as an HTTP request.
- All entry points propagate the same `TraceContext` via AsyncLocalStorage (see §9.3).

**MCP client shape — bundled stdio proxy:**
The Mneme plugin ships a small **local stdio MCP proxy** (`packages/plugin/mcp/index.ts`, ~80 lines) so that `/plugin install j10ra/mneme-plugin` is the only install step a user takes — MCP works out of the box, no separate registration. The proxy:
- reads `~/.mneme/config.json` once (server URL, Bearer key, machine id, scope auto-detect)
- speaks MCP JSON-RPC over stdio with the harness
- translates each tool call into `POST <server>/mcp` with `Authorization: Bearer <key>`
- holds the local **outbox** (Phase 3) so failed `/api/capture` calls queue locally and drain on reconnect

Mirrors claude-mem's "plugin contains the MCP" UX, but the proxy speaks to a remote `/mcp` instead of a local SQLite. From the harness's perspective it's a normal stdio MCP server. From our perspective it's just an HTTP client with extra resilience features.

### 9.2 Why one service

| Concern | Single service | Two services |
|---|---|---|
| Railway cost | $5/mo | $10/mo |
| Trace context across calls | In-process, native | HTTP header propagation |
| MCP-to-data latency | function call | HTTP round-trip |
| Failure blast radius | shared | independent |
| Independent scale | no | yes |

At personal scale, single wins on every axis except blast radius, which is acceptable for a personal tool.

### 9.3 Observability core (lens-pattern)

Adopted from `@lens/core` (lightweight structured logging + tracing, AsyncLocalStorage propagation, buffered async flush). Storage swapped from SQLite to Postgres so traces survive Railway restarts and live alongside Mneme data in the same Supabase.

**Wrappers (every entry point uses them):**

- `mnemeRoute(name)` — Hono middleware. Starts a root span on each request, captures request/response JSON (capped at 256 KB), tags `source` from `x-mneme-source` header.
- `mnemeFn(name, fn)` — wraps async functions. Inherits parent span, adds child span. Used inside route handlers and worker jobs.

**Context propagation:** Node `AsyncLocalStorage` carries `TraceContext = { traceId, spanStack[] }` through await boundaries. No explicit threading.

**Logger API** (used everywhere):

- `Logger.debug(msg)`, `Logger.info(msg)`, `Logger.warn(msg)`, `Logger.error(msg, err?)`
- Each call buffers a record with current `traceId` and `spanId` from context.
- Writes to **stderr** (never stdout, reserved for any future MCP stdio transport) in human-readable format locally, JSON in Railway production.

**Buffered flush:** in-memory buffers flushed every 100 ms (or at 1000-row capacity, whichever first) via a single Postgres transaction. Synchronous push to buffer; async write to DB. Hot paths never block on I/O.

**Source taxonomy** (`x-mneme-source` header / column):

| Source | Origin |
|---|---|
| `hook` | Claude Code / Codex / Cursor hook |
| `slash` | Slash command (`/memory`, `/recall`, `/summarise`, ...) |
| `cli` | `mneme` CLI |
| `mcp` | MCP client (Claude, Cursor, Codex, OpenCode) |
| `cron` | pg_cron (nap, dream trigger) |
| `worker` | Background worker job |
| `dream` | Dream-worker capture writeback |
| `infra` | Healthchecks, internal probes |

### 9.4 Observability schema (Supabase, `_ops` schema)

Kept in a dedicated `_ops` schema so it never collides with data tables.

```sql
CREATE SCHEMA IF NOT EXISTS _ops;

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

CREATE TABLE _ops.logs (
  id        BIGSERIAL PRIMARY KEY,
  trace_id  UUID,
  span_id   UUID,
  level     TEXT NOT NULL,        -- 'debug' | 'info' | 'warn' | 'error'
  message   TEXT NOT NULL,
  ts        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX logs_trace_idx ON _ops.logs (trace_id);
CREATE INDEX logs_ts_idx    ON _ops.logs (ts DESC);
CREATE INDEX logs_level_idx ON _ops.logs (level) WHERE level IN ('warn', 'error');

-- API keys: hashed Bearer tokens, per-machine, scoped, revocable.
CREATE TABLE _ops.api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash      TEXT NOT NULL UNIQUE,    -- sha256 of plaintext, never store plaintext
  name          TEXT NOT NULL,           -- e.g., 'macbook-pro', 'studio-mac', 'cli'
  machine_id    TEXT,                    -- bind to a specific machine, NULL = unbound
  scopes        TEXT[] NOT NULL DEFAULT '{capture,read,mcp}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX api_keys_active_idx ON _ops.api_keys (key_hash)
  WHERE revoked_at IS NULL;
```

**Retention:** pg_cron daily prune deletes traces older than 14 days; cascade removes spans and logs. `_ops.api_keys` is never auto-pruned. Tunable in config.

### 9.5 Authentication

Single mechanism for all auth-gated routes (`/api/*` and `/mcp`): **Bearer token in the `Authorization` header**. Same pattern as `j10ra-pinnacle-plugin`'s pinnacle-db MCP. Connection-level check (one check per HTTP request, before MCP transport is initialized for `/mcp`).

**Header format:**
```
Authorization: Bearer mneme_pat_<machine-name>_<random64>
```

The `mneme_pat_<machine>_` prefix is informational so a glance at logs tells you which machine made the call. The actual auth check is on the random suffix.

**Storage:** keys are hashed (`sha256`) before storage. Plaintext exists only on the issuing machine, in `~/.mneme/config.json`. The server never has the plaintext.

**Per-machine keys, revocable independently.** Three machines = three keys. Lose one laptop, revoke its key, the other two keep working.

**Scopes** limit what a key can do. Most personal keys have all three:

| Scope | Allows |
|---|---|
| `capture` | `POST /api/capture` (writes) |
| `read` | `POST /api/session/start` (surface reads) |
| `mcp` | `POST /mcp` (read-only SQL via the MCP tool) |

**Middleware flow** (runs before `mnemeRoute` on every auth-gated route):

```
1. Extract Authorization: Bearer <key> header
2. sha256 the key
3. SELECT * FROM _ops.api_keys WHERE key_hash = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
4. If not found: 401
5. If route's required scope not in row.scopes: 403
6. Attach { key_id, name, machine_id, scopes } to AsyncLocalStorage so spans can record which key did what
7. UPDATE _ops.api_keys SET last_used_at = now() WHERE id = ?  (debounced, async)
```

`/health` skips auth. Internal handlers skip auth (in-process function calls have no header).

**Client configuration** (`~/.mneme/config.json` per machine):

```json
{
  "server": {
    "url": "https://mneme.<your-railway-domain>"
  },
  "auth": {
    "key": "mneme_pat_macbook-pro_<random>"
  },
  "machine": {
    "id": "b3e2...",
    "name": "macbook-pro"
  }
}
```

**MCP client config** (`.mcp.json` in project, or `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "mneme": {
      "type": "http",
      "url": "https://mneme.<your-railway-domain>/mcp",
      "headers": {
        "Authorization": "Bearer mneme_pat_macbook-pro_<random>"
      }
    }
  }
}
```

**Key management is manual via SQL** (Supabase SQL editor or psql). No CLI. The `pgcrypto` extension provides `digest()` so plaintext generation, hashing, and insertion happen in one statement; the `RETURNING` row gives you the plaintext exactly once.

Issue a key:

```sql
WITH g AS (
  SELECT 'mneme_pat_macbook-pro_' || encode(gen_random_bytes(32), 'hex') AS plaintext
)
INSERT INTO _ops.api_keys (key_hash, name, machine_id, scopes)
SELECT
  encode(digest(plaintext, 'sha256'), 'hex'),
  'macbook-pro',
  '<machine-uuid>',
  ARRAY['capture','read','mcp']
FROM g
RETURNING (SELECT plaintext FROM g) AS plaintext, id;
```

Copy the returned `plaintext` into the issuing machine's `~/.mneme/config.json`. The DB only ever stores the sha256.

List keys:

```sql
SELECT
  substring(id::text, 1, 8) AS id,
  name,
  machine_id,
  scopes,
  last_used_at,
  CASE WHEN revoked_at IS NULL THEN 'active' ELSE 'revoked' END AS status
FROM _ops.api_keys
ORDER BY created_at DESC;
```

Revoke a key:

```sql
UPDATE _ops.api_keys SET revoked_at = now() WHERE name = '<name>';
```

**Why not rotate keys automatically?** Personal tool, three machines. Manual rotation when needed (lost laptop, suspected compromise) is fine. Auto-rotation adds complexity for no practical benefit at this scale.

### 9.6 Practical instrumentation rules

1. Every Hono route handler is wrapped by `mnemeRoute`. No exceptions.
2. Every async function called from a route or worker job that does external I/O (DB query, Voyage call, OpenRouter call) is wrapped by `mnemeFn`.
3. Errors are logged with `Logger.error` *and* re-thrown — the wrapper records the error message on the span automatically.
4. Sensitive inputs (`captures.content` may contain user code) are stored as input/output on spans; the same edge scrubber that runs on `/api/capture` runs on span input before write. `<private>` content never reaches `_ops.spans`.
5. The trace dashboard is Supabase's built-in SQL console plus saved queries (no custom UI in v1):
   - Traces in last hour by source, ordered by duration
   - Error rate by route per day
   - Top slow spans by `duration_ms`

---

## 10. Parity with claude-mem (the moat)

claude-mem's actual differentiation isn't "memory in a vector DB." It's a small set of UX moves that make memory *feel like* part of the harness. We adopt all of them, scoped to our principles.

| claude-mem feature | What we do | Where |
|---|---|---|
| **In-session memory surfacing without a tool call** | `POST /api/session/start` returns a pointer list (ids + one-liners): pinned, rules, recent cluster themes, recent cross-machine sessions for the repo. SessionStart hook prints to stdout; other harnesses prepend to first MCP response. ~1500 token cap. **No files written, no bodies.** | §6.6 Surface |
| **Rich observation taxonomy** (`bugfix`, `feature`, `decision`, `discovery`, `security_alert`, `preference`, `constraint`, `reference`) | Same taxonomy in `memories.kind`, used by recall filters and Surface | §3 Glossary, §5 Schema |
| **Per-event extraction** (secondary Claude in observer mode, every PostToolUse) | Default: 5-min coalescing per `session_id` for cost. Override: `kind ∈ {security_alert, decision}` are flagged urgent at hook time and bypass coalescing | §6.2 Process, §6.1 Capture |
| **Always-on local capture daemon with crash resilience** | Hooks fire-and-forget to `POST /api/capture`. Local outbox `~/.mneme/outbox/` retries on next session start. No daemon to keep alive. | §6.1 Capture, §8 Privacy |
| **Knowledge corpus Q&A agent** | `/mneme-ask <question>` slash command: runs default hybrid recall, then prompts the local Claude to synthesize. No separate sub-agent process. | §10 Phase 8 |
| **Multi-harness installers (Cursor, Gemini, OpenCode)** | Generic `POST /api/capture` + portable `mneme:using-mneme` skill. Each harness gets a thin install script. | §10 Phase 7 |
| **Smart tools** (`smart_outline`, `smart_unfold`, `timeline`, `get_observations`) | All expressible as SQL via the skill's canned patterns. One MCP tool, many query shapes. | §9 Skill |
| **`<private>` tag stripping** | Same. Edge scrubber in `POST /api/capture`. | §8 Privacy |
| **SDK-driven dedup** (UNIQUE on content_hash + session) | `UNIQUE (content_sha256, machine_id)` on captures + composite `chunk_id` on memories. | §5 Schema |
| **React viewer UI at localhost:37777** | Out of scope for v1. Use Supabase dashboard. Revisit in Phase 8 only if it earns its keep. | §10 Phase 8 |

**What we let go:**
- Local-only by design (we trade local latency for cross-machine; outbox covers offline).
- Per-event extraction cost (we coalesce by default, urgent-bypass for the kinds that matter).
- A separate worker daemon process (hooks + outbox is enough).

**What we improve:**
- Cross-machine. claude-mem doesn't.
- Cross-AI. claude-mem assumes Claude Code is the agent.
- Bitemporal supersede surfaced via `meta.superseded_by`. claude-mem doesn't model contradiction at all.
- One-tool MCP via SQL. claude-mem ships ~7 specialized tools.

---

## 11. The Skill: `mneme:using-mneme`

The skill is the documentation and the orientation. Loaded via Anthropic's progressive-disclosure pattern: description in system prompt, body on demand.

### What the skill teaches

1. **What Mneme is** (one paragraph).
2. **The three tables** (compact column list).
3. **The `embed()` macro** and how it composes with `<=>` and `ts_rank`.
4. **Five canned query patterns** (copy-paste-ready):
   - Default hybrid recall (the template above)
   - Recall by kind: `WHERE kind = 'decision'`
   - Recall by recency: `AND created_at > now() - interval '7 days'`
   - Cluster summaries only: `WHERE kind = 'cluster'`
   - Backlinks via meta jsonb: `WHERE meta->'related_to' ? $1::text`
5. **Scope filtering** (current repo, current machine, private flag).
6. **Write reminder**: writes go through `/memory` slash command or `POST /api/capture`. Never via SQL.
7. **What `nap` and `dream` do** so the agent understands why it sees `kind='cluster'` rows and what `meta.superseded_by` means.

### Why the skill, not more MCP tools

- One MCP tool means one thing to discover, learn, and pick correctly.
- Schema changes update the skill, not the MCP surface.
- The agent has full SQL power for queries we never anticipated.
- This is the same pattern as `pinnacle:pinnacle-db` and Claude Code's own grep+read approach: give a primitive, teach the patterns.

---

## 12. Build Phases

Each phase has explicit "done when" criteria. Phases 0-3 give you a usable system across machines. Phases 4-7 add intelligence. 8+ adds polish.

### Phase 0 — Foundation
**Goal:** infrastructure exists, with auth + observability from line one.
- [x] Supabase project provisioned (project ref `qufxxkwvauaachhefwmy`)
- [x] Mneme schema deployed (`captures`, `memories`, `ingest_jobs`)
- [x] `_ops` schema deployed (`traces`, `spans`, `logs`, `api_keys`, `schema_migrations`)
- [x] Bun monorepo scaffolded (`packages/server`, `packages/core`, `packages/shared`)
- [x] Hono server with `/health`, `/api/capture`, `/api/session/start`, `/mcp` routes
- [x] `@mneme/core` observability (`mnemeRoute`, `mnemeFn`, `Logger`, AsyncLocalStorage context, 100ms buffered flush to `_ops.*`)
- [x] Bearer-token auth middleware on `/api/*` and `/mcp` (sha256 lookup against `_ops.api_keys`, scope check, 401/403)
- [x] SQL migrations runner (`scripts/migrate.ts`, idempotent, tracks applied via `_ops.schema_migrations`)
- [x] `pg_cron` daily prune of `_ops.traces` older than 14 days (`mneme_ops_prune` at `0 3 * * *`)
- [x] Smoke test verified: `/health` 200, no-auth 401, wrong-scope 403, valid-scope 200, dedup path 200 with `deduped:true`, traces+spans+logs persisted in `_ops`
- [x] First key issued via SQL (see §9.5), plaintext copied to `~/.mneme/config.json`
- [ ] Railway deploy (deferred — local first; needed before hooks fire in Phase 3)
- [ ] Voyage credentials in Railway env (deferred — Phase 2)

**Done when:** an authed capture from any machine lands in Supabase **and** its full trace is queryable in `_ops`, **and** unauthed calls are rejected.

### Phase 1 — Capture
**Goal:** captures land reliably, with secrets stripped at the edge.
- [x] `POST /api/capture` with Bearer auth (Phase 0)
- [x] Sha256 + machine_id dedup (Phase 0)
- [x] Edge scrubber: `<private>...</private>` blocks + 9 secret patterns (AWS, GitHub PAT classic + fine, Anthropic, OpenAI, Slack, JWT, Bearer header, SSH private key). Hash computed on cleaned content; `_ops.spans` input/output also scrubbed via the `TraceStore` scrubber hook. 20 unit tests passing.
- [x] `ingest_jobs` enqueued (Phase 0)
- [ ] Local outbox + retry on hook side *(moved to Phase 3, lives in plugin)*

**Done when:** content with `<private>...</private>` and embedded secrets posts successfully but the secrets are absent from `captures.content` AND `_ops.spans.input`. Verified: AWS access key, GitHub PAT, and `<private>` block all redacted from both.

### Phase 2 — Recall (read MVP)
**Goal:** agents can search via SQL with vector + keyword + hybrid.
- [x] `mneme_reader` Postgres role (SELECT-only on `public.*`, blocked from `_ops.*`); separate connection pool in the server
- [x] Voyage client (`embedText`, `embedBatch`), `voyage-code-3`, 1024-dim, wrapped by `mnemeFn` so each call lands as a child span. Picked over `voyage-3` because Voyage's free tier covers `voyage-code-3` (200M tokens) and not the general `voyage-3` family (paid only). Quality is solid on prose despite the "code" label, and at personal scale 178M+ free tokens is years of headroom.
- [x] `/mcp` JSON-RPC dispatcher: `initialize`, `tools/list`, `tools/call`, `notifications/initialized`, `ping`. No SDK dep.
- [x] Single tool `mneme.sql(query)` with five safety layers: comment stripping, single-statement check, SELECT/WITH-only regex (rejects 17+ keywords), `embed('text')` macro substitution (batched), auto-`LIMIT 200`, 5s `statement_timeout` on the reader pool, 1MB result cap (truncate + flag)
- [x] `mneme:using-mneme` skill at `packages/shared/skills/using-mneme/SKILL.md` (schema reference + 7 canned query templates)

**Done when:** verified end-to-end: MCP `initialize` → handshake works; `tools/list` returns the schema; `tools/call mneme.sql` runs vector / kind-filter / hybrid queries against seeded memories; INSERT/DELETE/multi-statement/`_ops.*` access all rejected (regex rejects writes, DB role rejects `_ops`).

### Phase 3 — Hooks and Plugin (v1.0.0 shipped)
**Goal:** Claude Code captures automatically across all three machines, plugin install ships everything (MCP included).
- [x] Claude Code plugin scaffold (`packages/plugin/`) — installable via `/plugin marketplace add j10ra/mneme && /plugin install mneme@j10ra-mneme`
- [x] **Bundled local stdio MCP proxy** (`packages/plugin/scripts/mcp-proxy.ts`): reads `~/.mneme/config.json`, translates MCP JSON-RPC stdio → `POST <server>/mcp` with `Authorization: Bearer <key>`. Answers `initialize` / `tools/list` / `ping` locally so the MCP attaches even when the upstream server is unreachable; only `tools/call` is forwarded.
- [x] Plugin `.mcp.json` declares stdio transport pointing at the bundled proxy
- [x] `PostToolUse`, `UserPromptSubmit` hooks → `POST /api/capture` with `source='claude_hook'`
- [x] `Stop` and `PreCompact` hooks → `POST /api/capture` with `source='claude_summary'`
- [x] `PostToolUse(Write|Edit)` with path matcher `~/.claude/projects/*/memory/*.md` → `source='claude_memory'`
- [x] `SessionStart` hook → drains outbox + `POST /api/session/start` + prints surface markdown to stdout (3s timeout, fail-empty)
- [x] Slash commands: `/setup`, `/memory`, `/recall`, `/summarise`, `/pin`, `/unpin`
- [x] Local outbox (`~/.mneme/outbox/`) for failed captures, drained at next session start
- [x] `machine.id` auto-generation on first `/setup` run (uuid; preserves existing on subsequent runs)
- [x] Client-side scope enrichment: `repo` from session payload's `cwd` (Claude Code provides it; falls back to hook process cwd), `machine_id` from config, `harness=claude-code`, `agent` from `CLAUDE_MODEL` env
- [x] Pin actuation: `/api/capture` with `raw_meta.kind='pin'` triggers `UPDATE memories SET meta.pinned = ...` server-side (uuid-validated, try/catch wrapped, defense in depth in slash dispatcher too)

**Done when:** a fresh machine onboards with **3 commands**:
```
/plugin marketplace add j10ra/mneme
/plugin install mneme@j10ra-mneme
/setup <server-url> <api-key> [machine-name]
/reload-plugins
```
After that, MCP, hooks, slash commands, and the SessionStart surface all work. A memory written on machine A is recalled from any other harness on machine B.

Once registered (Phase 4.1), the **first `SessionStart` in any project automatically adds it to `~/.mneme/config.json` `projects[]`** — no per-project setup step. Subsequent events in unregistered cwd are rejected (defends against subagent / ghost-process leakage).

### Phase 4 — Process (extraction) (v1.0.4 shipped)
**Goal:** raw captures become structured memories.
- [x] Coalescing window: extract worker locks an oldest-queued seed job + all session siblings within ±5 min, runs one LLM call on the bundle
- [x] LLM provider: **Groq free tier**, `openai/gpt-oss-20b` (strict `json_schema` mode, `max_completion_tokens: 2048`). 20b chosen over 120b for higher TPM headroom on the free tier; provider-agnostic interface via `packages/server/src/groq.ts` makes the swap trivial.
- [x] Extraction prompt with `kind` taxonomy (`bugfix`, `feature`, `discovery`, `decision`, `preference`, `constraint`, `security_alert`, `reference`, `summary`, `note`) + explicit `DO NOT extract` anti-pattern list (assistant meta, tool-call events, trivial status). Empty `observations: []` is the valid common answer.
- [x] Input caps: 1500 chars/capture × 6000 chars/window keep us under the 8K TPM cap on free tier
- [x] Memory chunks: composite `chunk_id = sha256(content_hash + ":" + embedding_model)` so re-embedding under a new model creates fresh rows instead of overwriting
- [x] Voyage `embedBatch` (up to 32 memories per call) + `to_tsvector('english', content)` at insert time
- [x] Initial importance: LLM self-rated 0.1-1.0, clamped at write time
- [x] Two-phase queue: `extract` enqueued by `/api/capture`; `embed` enqueued by extract worker per memory (migration 0006 added `memory_id` FK on `ingest_jobs`)
- [x] Rate-limit handling: `GroqRateLimitError` parses Groq's `try again in Ns`; worker re-queues without burning attempts and sleeps the parsed duration. Voyage 429 same path.
- [x] Retry policy: jobs in `state='error'` with `attempts < 5` are picked up again on the next tick (transient errors self-heal without manual reset)

**Done when:** `mneme.sql` returns relevance-ranked, kind-filtered memories rather than chronological raw text. ✓ Verified by hybrid recall returning embedded memories with cosine + ts_rank scoring.

### Phase 4.1 — Hardening (v1.0.5 shipped)
**Goal:** keep the noise out so recall stays high-signal.
- [x] Hook hard blacklist: skip captures from `/.claude/`, `/tmp/`, `/var/tmp/`, `/private/var/folders/`, `/proc/`, `/sys/` — kills ghost-agent activity (claude-mem observer subagents and any subprocess Claude Code instances spawned by other plugins) at the edge
- [x] Hook tool-name blacklist: `TodoWrite`, `Skill`, `Task*`, `EnterPlanMode`/`ExitPlanMode`, `AskUserQuestion`, `ListMcpResourcesTool`, `ReadMcpResourceTool`, `ScheduleWakeup`, `Monitor`, `ToolSearch`. Plus regex match on `/mneme/i` and `/claude.?mem/i` to break the recursive memory-about-the-memory-system loop.
- [x] Hook project allowlist: `~/.mneme/config.json` grows a `projects: { path, registered_at }[]` array. `SessionStart` auto-registers the current `cwd` if it passes the hard blacklist; non-`SessionStart` events check `cwd.startsWith(project.path)` and reject otherwise. Zero-friction onboarding (no manual `register` step) with auto-defense against future plugins.
- [x] Strengthened extraction prompt: explicit `DO NOT extract` examples (assistant meta, tool-call events, trivial status); importance floor 0.3 (drop anything below).
- [x] Scrubber adds `groq_key` (`gsk_*`) and `voyage_key` (`pa-*`) patterns.

**Done when:** a single recall returns mostly signal, not self-referential agent meta. ✓ Verified by archiving 16 noise rows + bulk-deleting 51 captures + 21 memories tagged `dir:observer-sessions`.

### Phase 5 — Nap
**Goal:** quiet importance management.
- [ ] pg_cron 6h job invoking `mneme.nap()` SQL function
- [ ] Exp decay on importance with τ = 30 days
- [ ] Pin floor for `meta.pinned = true`
- [ ] Near-dup detection writing `meta.related_to`

**Done when:** untouched memories visibly fade over a week, pinned ones do not, and `meta.related_to` populates for similar items.

### Phase 6 — Dream
**Goal:** consolidation that surfaces in recall.
- [ ] pg_cron nightly enqueues a `phase='dream'` job
- [ ] Worker clusters memories per repo (cosine-NN graph + connected components for v1)
- [ ] LLM distills clusters into title + summary
- [ ] Inserts `kind='cluster'` rows with `meta.member_ids`
- [ ] Supersede detection writes `meta.superseded_by` on older memories

**Done when:** after a week of captures, `/recall` for a broad topic returns `kind='cluster'` summaries above raw captures.

### Phase 7 — Surface (claude-mem's moat)
**Goal:** memories appear in Claude Code without a tool call, via SessionStart hook stdout. **No files written.**
- [ ] `POST /api/session/start` extended to return rendered markdown body (pinned + preferences + constraints + top 3 cluster summaries, scoped to current repo)
- [ ] Server-side render with ~2000 token budget cap (configurable)
- [ ] Server-side cache per `(machine_id, repo)`, 60s TTL
- [ ] Claude Code SessionStart hook = `curl --max-time 3 .../api/session/start | print` (3s budget, fail-empty)
- [ ] `/pin <id>` and `/unpin <id>` slash commands flip `meta.pinned` via `POST /api/capture` with special source
- [ ] Other harnesses (Codex/Cursor) without SessionStart hooks: surface body prepended to first `mneme.sql` response from MCP server

**Done when:** a pinned preference written on machine A appears as session additional-context on machine B at next Claude Code SessionStart, automatically. Verify by inspecting the session header — should see `Mneme — github.com/<repo> · ...` with the preference listed, like the `$CMEM Mneme` block already present in this very session.

### Phase 8 — Multi-harness
**Goal:** Codex, Cursor, web all participate.
- [ ] Codex hooks → `POST /api/capture`
- [ ] Cursor rules file or plugin → `POST /api/capture`
- [ ] Generic `POST /api/capture` documented
- [ ] `mneme.sql` MCP server published as installable for any MCP client
- [ ] `mneme:using-mneme` skill ported to Codex/Cursor formats

**Done when:** a memory written from Cursor on machine A is recalled from Codex on machine B.

### Phase 9 — Polish
**Goal:** lived-in.
- [ ] `/mneme-ask <question>` slash command: hybrid recall + local-Claude synthesis (knowledge-corpus Q&A, claude-mem parity)
- [ ] `/archive <id>` slash command (POST to `/api/capture` with special source)
- [ ] `NORMALIZE_VERSION` bump triggers re-embed backfill cron
- [ ] Observability: capture rate, queue depth, dream worker SLA, embed cost/day, Surface freshness
- [ ] CLI for export / dump / migrate
- [ ] Optional: viewer UI (revisit only if it earns its keep; Supabase dashboard covers v1)
- [ ] README

---

## 13. Cost Model (personal scale, 3 machines)

| Item | Frequency | Unit cost | Monthly est. |
|---|---|---|---|
| Railway Hobby | always-on | $5/mo | $5.00 |
| Voyage embeddings (voyage-code-3, free tier) | ~50-200 chunks/day | $0 (200M/mo free) | $0 |
| LLM extract + distill | TBD at Phase 4 | varies | $0-4 |
| Supabase | small DB, low bandwidth | free tier | $0 |
| **Total** | | | **~$5-9/mo** |

Re-embed migration (one-time when switching embedding model): typically free under voyage-code-3's tier; would be ~$5-15 if upgrading to voyage-3-large or similar paid model.

---

## 14. Open Questions

1. **LLM provider for extraction.** Groq free, Ollama local, or OpenRouter paid. Decided at Phase 4 with real captures in hand.
2. **Coalescing window length.** 5 min is a guess; tune with data.
3. **Cluster algorithm.** Cosine-NN graph + connected components for v1 (simpler). HDBSCAN later if quality lags.
4. **Voyage model.** Locked on `voyage-code-3` for cost reasons (Voyage's free tier covers it; `voyage-3` is paid-only). Same 1024-dim, code-tuned but solid on prose. Re-embed migration planned via `chunk_id` model-scoped hashing if we ever switch.
5. **MCP transport.** stdio for Claude Code local, HTTP for others, or HTTP-only? Pick after Phase 2.
6. **Should `mneme.sql` accept multiple statements, or strictly one?** Default to one for safety.
7. **When does the fourth table arrive?** It arrives the moment a query genuinely cannot be expressed against `meta jsonb` performantly. Not before.

---

## 15. Non-goals (so we don't drift)

- Multi-tenant or team memory.
- Real-time sync between sessions.
- Replacing `git log`, `claude-mem` local features, or your editor's history.
- Any synchronous LLM call on the capture path. Captures must always return in under 200 ms.
- Auto-resolving cross-scope contradictions. Different repos can hold different truths.
- Bootstrap that injects memory bodies into the system prompt. Ever.
- A growing MCP tool surface. One read tool, period.
