# Recipes — common question shapes

Question patterns that recur. Each maps to a query template plus which workflow layer to start at.

> Load when: the user's question matches one of the shapes below. Otherwise the 3-layer workflow in [`../SKILL.md`](../SKILL.md) is enough.
> See also: [`navigation.md`](./navigation.md) for graph walks, [`schema.md`](./schema.md) for column reference.

---

## "What did we decide about X?"

Start at Layer 1 with a `kind` filter. Decisions cluster well — if a hit has `in_cluster`, walk to the cluster summary (it'll give you the *evolution*, not just the latest).

```sql
-- Layer 1: search by kind, semantic match
SELECT id, importance, created_at, meta->>'in_cluster' AS in_cluster,
       substring(content, 1, 220) AS preview
FROM memories
WHERE archived_at IS NULL
  AND kind = 'decision'
  AND (meta->>'shadow_of') IS NULL
ORDER BY (1 - (embedding <=> embed('X'))) * 0.7 + 0.3 * importance DESC
LIMIT 5;
```

If a top hit's `superseded_by` is not null, walk the supersede chain forward to current truth (see [`navigation.md`](./navigation.md)).

---

## "What did the user say about X?" (raw transcript)

Captures, not memories. The `captures` table has the raw event log.

```sql
SELECT captured_at, source, substring(content, 1, 300) AS preview
FROM captures
WHERE archived_at IS NULL
  AND source = 'claude_hook'
  AND content ILIKE '%X%'
ORDER BY captured_at DESC LIMIT 10;
```

`source` taxonomy on captures:

| source | What it carries |
|---|---|
| `claude_hook` | What the user typed OR what the agent ran (UserPromptSubmit + PostToolUse). User prompts are short text; tool calls are JSON beginning with `{"tool":...}`. |
| `claude_assistant` | What the agent said in the session transcript. |
| `claude_summary` | Stop / PreCompact session digests (full payload as JSON). |
| `claude_memory` | Auto-memory writes the agent made to `~/.claude/projects/*/memory/*.md`. |
| `manual:/memory` | Explicit `/mneme:memory` slash. |
| `manual:/api/memory` | Direct memory write (`/mneme:pin <text>`, bypasses extract). |

For "what did the user say" specifically: filter `source = 'claude_hook'` AND `content NOT LIKE '{%'` to exclude tool-call JSON.

---

## "What was I working on yesterday?" (timeline)

Captures, by recency. Group by session for narrative coherence:

```sql
SELECT session_id, machine_id, count(*) AS events,
       min(captured_at) AS started, max(captured_at) AS ended,
       array_agg(DISTINCT source) AS sources
FROM captures
WHERE archived_at IS NULL
  AND captured_at > now() - interval '36 hours'
  AND repo = '<canonical-git-url>'  -- optional
GROUP BY session_id, machine_id
ORDER BY ended DESC LIMIT 10;
```

Then unfold a specific session:

```sql
SELECT captured_at, source, substring(content, 1, 250) AS preview
FROM captures
WHERE session_id = '<chosen-session-id>'
  AND archived_at IS NULL
ORDER BY captured_at ASC;
```

---

## "What's been clustered around topic X?" (themes)

Cluster summaries are LLM-distilled views — read these *before* their members:

```sql
SELECT id, importance, created_at,
       meta->>'cluster_title' AS title,
       jsonb_array_length(meta->'member_ids') AS member_count,
       substring(content, 1, 300) AS summary
FROM memories
WHERE archived_at IS NULL AND kind = 'cluster'
ORDER BY (1 - (embedding <=> embed('X'))) DESC LIMIT 5;
```

A 5-sentence cluster summary often answers a "what's the state of X" question without needing to unfold a single member.

---

## "Pivot from a surface row"

The SessionStart surface looks like:

```
- [a3f29c7d-1234-5678-9012-abcdef123456] ⚖️ 0.90 Use the daemon's Claude SDK for extract
- [c4f2a1b9-5678-9012-3456-abcdef987654] 5d ago · 🔴 Pin actuation needs UUID validation
```

Surface rows carry full UUIDs. Match by exact id:

```sql
SELECT id, content, kind, importance, repo, machine_id,
       meta->'related_to' AS related_to,
       meta->>'in_cluster' AS in_cluster
FROM memories WHERE id = 'a3f29c7d-1234-5678-9012-abcdef123456' AND archived_at IS NULL LIMIT 1;
```

(If you only have a partial id from older transcripts, `WHERE id::text LIKE 'a3f29c7d%'` still works.)

**Glyph legend** (for reading the surface):
🔴 bugfix · 🟣 feature · ⚖️ decision · 🔵 discovery · 💬 preference · 🚧 constraint · 🚨 security_alert · 📎 reference · 🎯 summary · 🧩 cluster · 🧠 claude_memory · 📝 note

---

## "Across machines / on machine X"

Resolve a friendly machine name first:

```sql
WITH m AS (
  SELECT machine_id FROM machines
  WHERE name = 'qube-laptop' AND revoked_at IS NULL LIMIT 1
)
SELECT c.captured_at, c.source, substring(c.content, 1, 200) AS preview
FROM captures c, m
WHERE c.machine_id::uuid = m.machine_id::uuid AND c.archived_at IS NULL
ORDER BY c.captured_at DESC LIMIT 20;
```

Fall back to `name ILIKE '%fragment%'` if exact match returns nothing. A machine that was revoked + re-registered shows two rows; use `revoked_at IS NULL` to pick the live one.

---

## Captures fallback (when memories returns 0 rows)

The `memories` table may not be populated for a fresh corpus (extractor / embedder hasn't run yet). Fall back to keyword search on `captures.content` before declaring no results:

```sql
SELECT id, source, repo, machine_id, captured_at,
       substring(content, 1, 200) AS preview
FROM captures
WHERE archived_at IS NULL
  AND content ILIKE '%' || 'your query' || '%'
ORDER BY captured_at DESC LIMIT 10;
```

Same synthesis rules — read previews, answer naturally, don't dump rows.

---

## Recent across all machines (last week)

```sql
SELECT id, kind, machine_id, created_at, substring(content, 1, 200) AS preview
FROM memories
WHERE archived_at IS NULL
  AND created_at > now() - interval '7 days'
  AND (meta->>'shadow_of') IS NULL
ORDER BY importance DESC, created_at DESC LIMIT 20;
```

## Backlinks (memories that reference this one)

```sql
SELECT id, kind, substring(content, 1, 200) AS preview
FROM memories WHERE meta->'related_to' ? '<target-uuid>'
  AND archived_at IS NULL
LIMIT 10;
```
