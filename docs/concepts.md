# Concepts

The vocabulary used everywhere else. Read this first if other docs use a term you don't recognize.

> See also: [`data-model.md`](./data-model.md) for the schema these terms map to.

---

| Term | Meaning |
|---|---|
| **Capture** | Raw, immutable input event from a hook, slash command, or HTTP POST. The `captures` table never updates after insert. |
| **Memory** | A chunk of a capture with embedding, tsvector, kind, scope, importance. Cluster summaries are *also* memories — same table, `kind='cluster'`. |
| **Bundle** | The unit of work the daemon posts to the server. Shape: `{ capture, memories[] }`. Built locally — capture is scrubbed/hashed/dedup-checked, memories are LLM-extracted, embedded, and stamped with `chunk_id` before posting. The server's `/api/bundle` is the dedup wall: `UNIQUE (content_sha256, machine_id)` makes duplicate posts harmless. |
| **Outbox** | Daemon-local file queue at `~/.mneme/outbox/`. Captures land in `captured/`, become `observations/` after extract, become `embedded/` after embed, post to the server as bundles, and are deleted on success. Permanent failures move to `failed/` with a reason file. The directory **is** the state. |
| **Kind** | One of `note`, `bugfix`, `feature`, `discovery`, `decision`, `preference`, `constraint`, `security_alert`, `reference`, `summary`, `cluster`, `claude_memory`. Drives recall filters and surface aggregation. |
| **Scope** | The `(machine, repo, harness, agent, topics[])` tuple on every capture and memory. Repo is the cross-machine join key. |
| **Importance** | Salience score in `[0, 1]`. Decays each nap cycle. Floors at `FLOOR=0.05` for unpinned, `PIN_FLOOR=0.5` for pinned. |
| **Pinned** | `meta.pinned = true`. Surfaces in every session, never decays below `PIN_FLOOR`, exempt from clustering and supersede. |
| **Archived** | `archived_at IS NOT NULL`. Set by nap's auto-archive phase on memories that decayed to irrelevance (importance ≤ 0.1, recall_weight = 0, age ≥ 30 days, not pinned/clustered/superseded). Stays queryable via `mneme_sql`; excluded from surface. `/mneme:unarchive` restores. |
| **Superseded** | Older memory replaced by a newer one. `meta.superseded_by = <newer_id>`. Not deleted; rank-down × 0.3 in recall, filtered from surface. |
| **Cluster / Theme** | A `kind='cluster'` memory written by the dream worker. `meta.member_ids[]` lists the constituents; `meta.cluster_title` is the short label. Member memories get `meta.in_cluster = <cluster_id>` (sticky). |
| **In-cluster** | `meta.in_cluster IS NOT NULL` — this memory belongs to a cluster, dream's skip-list excludes it from re-clustering. |
| **Embed macro** | `embed('text')` inside SQL passed to `mneme_sql`. The MCP tool replaces it with a vector literal from the configured embedder before execution. |
| **Nap** | Server-side, every 4h, pure SQL. Importance + recall_weight decay, auto-archive orphans, relate, rule-based supersede. See [`workers/nap.md`](./workers/nap.md). |
| **Dream** | Daemon-side, every 8h, LLM-driven clustering. Distributed-leader via durable lock row in `_ops.dream_runs` (INSERT ON CONFLICT). NDJSON-streamed candidates. See [`workers/dream.md`](./workers/dream.md). |
| **Digest** | Server-side, every 24h, opt-in (`MNEME_DIGEST_ENABLED=1`). Cross-cluster merge (DIGEST_MERGE_DISTANCE = 0.2) + supersede. See [`workers/digest.md`](./workers/digest.md). |
| **Surface** | Per-session injection. `/api/session/start` returns five sections of memory pointers (Pinned, Rules, Themes, Recent, Sessions); the SessionStart hook prints them as Claude Code's `additionalContext`. Never writes to user files. See [`surface.md`](./surface.md). |
| **Recall** | Read path via the MCP `mneme_sql` tool. Hybrid score (cosine + ts_rank + importance) with rank-down for superseded. See [`recall.md`](./recall.md). |
| **Source** | Origin tag on a capture row. Today: `claude_hook`, `claude_summary`, `claude_assistant`, `claude_memory`, `manual:/memory`, `manual:/api/memory`. |
| **Urgent capture** | Kinds `security_alert`, `decision`, or explicit `urgent: true` flush the daemon's coalescing gate immediately rather than waiting for the idle / batch-full / force timers. |
| **Skill** | The bundled MCP-companion (`packages/plugin/skills/using-mneme/SKILL.md`) that teaches the agent how to write `mneme_sql` queries. Loaded on demand via Anthropic's progressive-disclosure pattern. |

---

## Two invariants worth memorising

1. **Captures are immutable.** Every later phase is additive: new memory rows, updated `meta jsonb`, flipped `archived_at`. **Never DELETE.** Bitemporal supersede via flags.
2. **`meta.in_cluster` is sticky.** Once set, the daemon dream never re-clusters. Only [`workers/digest.md`](./workers/digest.md) can re-point it via cluster merges.
