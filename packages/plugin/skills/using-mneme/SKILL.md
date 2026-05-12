---
name: using-mneme
description: Recall what was decided, done, or said across this repo's history — cross-machine. Use mneme_sql to query the persistent memory store before assuming you don't have prior context. Triggers on questions like "did we already solve this?", "what was the decision on X?", "how did we last fix Y?", "what was I working on yesterday?", or any historical question the SessionStart surface didn't already answer. Mneme stores a graph of memories (decisions, bugfixes, features, summaries, clusters); navigate it deliberately — search index, then walk relations, then unfold full content.
---

# Mneme: cross-machine memory via SQL

Mneme is a persistent memory layer that captures everything you and the user have worked on, across machines. The agent talks to it through one tool: `mneme_sql(query)` — read-only, SELECT only, auto-`LIMIT 200`, 5s timeout, 1MB result cap.

## When to use

Use Mneme when the user asks about **work that already happened** (not the current turn):

- "Did we already…", "have we discussed…", "how did we solve… last time"
- "What was the decision on…", "what's our policy for…"
- "What was I working on yesterday / last week / on machine X"
- A reference like "the bug we hit", "that decision", "the homelab finding" — when context is missing in the current session

Don't use when:
- The answer is in the current conversation.
- The question is about live state (run `git log`, read the file, query the dashboard).
- You want to *write* a memory (use `/mneme:memory` or `/mneme:pin` slashes — never write through `mneme_sql`).

The SessionStart surface (the markdown that landed in your context at session start) already pre-loaded **pinned facts, rules, recent decisions, themes, and session summaries**. Every line carries a full `[uuid]` you can pivot from with `WHERE id = '<uuid>'`. Check the surface first. Only query Mneme when the surface didn't cover the question.

---

## The 3-layer workflow (always follow)

**Don't fetch full rows up front.** Filter to a small set of IDs, then unfold. Same pattern as `mem-search` in claude-mem; ~5–10× token savings on broad recall.

### Layer 1 · Search — get a lightweight index

Pull the smallest row shape that lets you decide what's relevant. Always preview-only.

```sql
SELECT id, kind, repo, importance, created_at,
       meta->>'in_cluster'    AS in_cluster,
       meta->>'superseded_by' AS superseded_by,
       substring(content, 1, 200) AS preview
FROM memories
WHERE archived_at IS NULL
  AND (meta->>'shadow_of') IS NULL
ORDER BY
  (
    0.6  * (1 - (embedding <=> embed('your query'))) +
    0.4  * ts_rank(tsv, websearch_to_tsquery('english', 'your query')) +
    0.05 * importance
  )
  * CASE WHEN meta->>'superseded_by' IS NOT NULL THEN 0.3 ELSE 1 END
DESC
LIMIT 10;
```

Read the previews. Pick the IDs that matter. **Discard the rest.**

If 0 rows: read [`references/recipes.md`](./references/recipes.md) for the captures-fallback pattern.

### Layer 2 · Walk — follow the graph

Memories form a graph. A search hit rarely tells the whole story; the *cluster summary* + *siblings* + *supersede chain* tells the story. After Layer 1, walk the relevant edges.

| Edge | What it gives you |
|---|---|
| `meta.in_cluster` | the cluster summary — a one-paragraph distillation of N related memories. **Almost always cheaper to read than the members themselves.** |
| `meta.member_ids` | the members of a cluster — the raw story behind the summary |
| `meta.related_to` | semantic neighbours (cosine < 0.15) recorded by the nap worker |
| `meta.superseded_by` | the newer version that replaced this one. Walk forward to find current truth |

When a top hit has `meta.in_cluster`, fetch the cluster summary first — it's often enough on its own. Full walk queries (cluster, related_to, supersede chain) are in [`references/navigation.md`](./references/navigation.md).

### Layer 3 · Unfold — full content for the chosen few

Once you've filtered to memories that actually matter (usually 1–5), fetch full content:

```sql
SELECT id, content, kind, importance, repo, machine_id, created_at, meta
FROM memories
WHERE id = ANY (ARRAY['<id1>', '<id2>', '<id3>']::uuid[]);
```

---

## Verify live-state claims before quoting

**Memories age. A memory true at write time can be stale days later** — especially anything that references *live state*. Before quoting back to the user, scan each row and verify what you can. This is the difference between "Mneme said so" and "this is currently true".

**Live-state indicators (watch for these in the content):**

- Numbers paired with status — issue / PR / ticket ids, priorities, "open / closed / merged / pending / in progress"
- Version numbers
- Counts — "N captures stranded", "M failed jobs", "K rows remaining"
- File paths or symbol names
- Machine identifiers, hostnames, env values
- Phrasing like "currently", "is open", "remains", "active"

**Verify with whatever tool fits the project.** Don't assume a specific stack — choose based on what's actually available in this repo / harness / session:

- Status of an external resource (issue tracker, board, CI, deployment) → the project's CLI, API, or dashboard if discoverable.
- File or symbol existence → read or grep the codebase.
- Counts or DB state → re-run the matching `mneme_sql` query.
- Versions / config → read the config file.

If you can't verify a claim from this session, **say so explicitly** — "this fact looks stale and I can't verify it from here" — rather than quoting the memory as if it's current.

**Skip verification for:**
- `kind` ∈ `decision`, `preference`, `constraint` — the *why* ages slowly even when the state changes.
- Architecture claims (verify against the code, not against a memory).
- Memories created in the last 24 hours — usually still current.

**When verification disagrees with the memory:**

1. **Quote the live state**, not the memory.
2. Tell the user plainly: *"Mneme has X but live shows Y — looks like the memory hasn't caught up."*
3. Suggest the user run `/mneme:memory` to record the correction. Newer fact + supersede keywords (`no longer`, `now`, `closed`, `replaced`) will let nap's rule-based supersede mark the old memory stale on the next 6h cycle.

---

## Synthesising the answer

After you've gathered the rows, **answer the user's question, don't dump the database.**

- Conversational prose. Write like a colleague who just looked something up.
- Don't surface metadata (id, kind, repo, timestamp) unless the answer specifically depends on it. Raw rows live in the tool response — you can refer back without echoing them.
- Synthesise across overlapping rows. If three memories all point to the same decision, state it once.
- If a specific memory IS the answer, quote the salient phrase, not the full row.
- If the rows don't really answer the question, say so plainly — don't pad with marginally-related content.
- Match length to the question: specific question → 1–3 sentences; broad question → short paragraph.

---

## References (load on demand)

Don't load these up front. Read the relevant one when you actually need it.

| When | Read |
|---|---|
| Question matches a recurring shape (decisions, transcript, timeline, themes, surface pivot, machine-scoped) | [`references/recipes.md`](./references/recipes.md) |
| Walking the memory graph (cluster summary + members, related neighbours, supersede chains) | [`references/navigation.md`](./references/navigation.md) |
| Need column types, jsonb shapes, or the source taxonomy | [`references/schema.md`](./references/schema.md) |
| Hit a SQL error or unexpected empty result | [`references/mistakes.md`](./references/mistakes.md) |

The 3-layer workflow above plus `references/recipes.md` cover ~90% of recall questions. The other references are deep-dive material.

---

## What this tool will not run

- `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `VACUUM`, `REINDEX`, `REFRESH`, `COPY`, `CALL`, `DO`, `EXECUTE`, `LOCK`, `MERGE`
- More than one statement per call
- Anything against `private = true` rows (RLS-blocked at the role level)

The connection runs as `mneme_reader` which physically lacks write privileges.

## Writing memories (don't use mneme_sql)

| Goal | Tool |
|---|---|
| Save a fact in the user's words | `/mneme:memory <text>` slash |
| Pin a one-liner so it surfaces every session | `/mneme:pin <text>` slash |
| Pin / unpin an existing memory by id | `/mneme:pin <uuid>` / `/mneme:unpin <uuid>` |
| Wrap up the current session | `/mneme:summarise` slash |

Hooks fire automatically — most memories get captured without a slash command.
