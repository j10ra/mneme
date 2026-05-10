# Memories panel — design

Date: 2026-05-10
Status: approved
Closes the third major acceptance item of #32 (the dashboard ticket).

## Goal

A Memories panel for the local Mneme dashboard. Read-only v1. Lets the operator browse, search, audit, and inspect the memories Mneme has accumulated across machines.

## Scope

The panel covers four overlapping use cases the operator should be able to satisfy from one surface:

- **Audit clustering** — see how the brain trio (nap / dream / digest) is grouping memories, which got superseded.
- **Browse recent** — quick "what is Mneme remembering today" feed.
- **Search and pivot** — query memories by content (hybrid: embed + ts_rank), then pivot to related neighbors / supersede chain / cluster.
- **Operational stats** — count + cluster count surfaced in the top bar header.

Out of scope for v1: write actions (archive, pin, manual cluster), graph view, multi-select bulk operations, mobile.

## Layout

Master + detail with **inline expand**. The panel sits in the left content area below Machines, scrolls vertically, takes whatever width the resizable layout gives it.

```
┌─ Memories ──────────────── 1,247 in last 7d · 38 clusters ─┐
│  [search hybrid q...]    [⚙ filters]   [☷ group: clusters] │
│  Time: [24h] [7d✓] [30d] [all]                              │
│  Machines: [● macbook.pro 412] [● qube 320] [● air 515]    │
│  Repos: [j10ra/mneme 1100] [pinnacle 147] ...               │
│  Source: [hook] [summary] [system]                          │
│  Cluster: [in_cluster] [orphaned] [shadow] [superseded]    │
│  ─────────────────────────                                  │
│  [memory row]                                               │
│  [memory row — expanded with tabs]                          │
│  [memory row]                                               │
│  Loading more…                                              │
└─────────────────────────────────────────────────────────────┘
```

- **Top bar.** Search input on the left, stats summary on the right, `[⚙ filters]` to collapse the filters strip, group-by-cluster toggle.
- **Filters strip.** Five rows of multi-select chips. Defaults open. Toggling a chip refetches from offset 0.
- **Rows.** Three-line chip-rich. Click any row → it expands inline below itself, pushing rows below down. Multiple expansions allowed.
- **Expanded row.** Four tabs: Content+Meta (default), Related, Chain, Cluster+Capture. Each tab fetches its data lazily on first open.
- **Group by cluster.** When ON, results grouped under cluster header rows (8-char id, member count, last_window, optional summary). Click header to collapse/expand its members.
- **Infinite scroll.** Sentinel div at bottom; entering viewport triggers next batch fetch.

## Defaults

| | default |
|---|---|
| Time range | last 7d |
| Scope | all machines (cross-machine) |
| Group by cluster | OFF |
| Page size | 50 |
| Search | empty |
| Filters strip | open |

## Server endpoints (new)

All five endpoints are added to `packages/server/src/routes/ops.ts` with `requireAuth("read")`.

```
GET /api/_ops/memories
    ?since=&until=                     ISO; defaults to (now - 7d, now)
    &repo=&machine_id=                 comma-separated multi
    &source=&cluster_status=           comma-separated multi
    &q=                                hybrid search query
    &limit=&offset=                    paging; default 50, max 200
  → { memories: [{ id, content, source, repo, machine_id, machine_name,
                   cluster_id, importance, pinned, captured_at, score? }],
      total: number }

GET /api/_ops/memories/<id>/related?k=6
  → { related: [{ id, content_preview, distance }] }

GET /api/_ops/memories/<id>/supersede-chain
  → { parents: [...], children: [...] }

GET /api/_ops/memories/<id>/capture
  → { capture: { content, source, raw_meta, captured_at } }

GET /api/_ops/clusters?since=&until=&limit=
  → { clusters: [{ id, summary, member_count, last_window_at,
                   sample_machine_ids[] }] }
```

### Hybrid search

When `q` is non-empty, the memories endpoint uses the same scoring path as `/mneme:recall`: server-side `embed(q)` produces a 1024-dim vector, then a query merges `1 - (embedding <=> vec)` cosine similarity with `ts_rank(tsv, websearch_to_tsquery(q))`. Reuse the existing recall helper if one exists; otherwise factor a small `searchMemories({ q, filters, limit, offset })` helper out of the recall path so both consumers stay in sync. Plain filter queries (no `q`) skip the embedder hop entirely.

### Filter encoding

`cluster_status` values map to predicates:
- `in_cluster` → `meta.in_cluster IS NOT NULL`
- `orphaned`   → `meta.in_cluster IS NULL AND meta.superseded_by IS NULL AND meta.shadow_marked_at IS NULL`
- `shadow`     → `meta.shadow_marked_at IS NOT NULL`
- `superseded` → `meta.superseded_by IS NOT NULL`

Time, repo, machine_id, source filter directly on their respective columns.

### Statement-timeout discipline

Postgres on Railway has `statement_timeout = 2min`. The /memories endpoint uses an outer `LIMIT 200` cap and indexed columns (machine_id, captured_at, embedding via ivfflat). The /clusters endpoint similarly capped. /related uses `<=>` against ivfflat which is fast under cap.

## Daemon proxies

`packages/daemon/src/routes/dashboard.ts` adds five proxy routes that forward query string verbatim using `cfg.auth.key`:

```
GET /dashboard/api/memories[?...]
GET /dashboard/api/memories/<id>/related?k=
GET /dashboard/api/memories/<id>/supersede-chain
GET /dashboard/api/memories/<id>/capture
GET /dashboard/api/clusters[?...]
```

Same pattern as `/dashboard/api/server-logs` — straight `fetch` with bearer + content-type passthrough.

## React components

```
packages/plugin/dashboard/src/components/
└─ MemoriesPanel.tsx              top-level, fetches + state
   ├─ MemoriesFilters.tsx         filter chip rows
   ├─ MemoriesSearchBar.tsx       search + group toggle
   ├─ MemoryRow.tsx               three-line chip-rich
   │  └─ MemoryExpand.tsx         tabbed expansion shell
   │     ├─ TabContentMeta.tsx    no fetch (data already in row)
   │     ├─ TabRelated.tsx        fetches /related on first open
   │     ├─ TabChain.tsx          fetches /supersede-chain on first open
   │     └─ TabClusterCapture.tsx fetches /capture on first open
   └─ ClusterHeader.tsx           when groupByCluster ON
```

State at the panel level (`useState`):
- `filters`: `{ since, until, repo: string[], machine_id: string[], source: string[], cluster_status: string[] }`
- `query`: string (debounced 300ms before triggering refetch)
- `groupByCluster`: boolean
- `expandedIds`: `Set<string>` (memory ids currently expanded)
- `entries`: `MemoryRow[]` (paginated; appended on infinite-scroll fetches)
- `total`, `offset`, `loading`, `error`, `stale`

Per-row expand fetches are lazy and cached in a `Map<id, { related?, chain?, capture? }>` ref so re-expanding doesn't refetch.

Search input cancels in-flight fetches via `AbortController`.

## State contract per panel

Same shape we use for Status + Machines:

| state | UI |
|---|---|
| loading | shadcn skeleton rows |
| empty | dashed-border "no memories match the current filters" hint |
| error | `<Alert variant="destructive">` with retry |
| stale | banner above content: "last updated Xm ago — last error: …" |

Per-tab fetches show a small inline spinner inside the expanded row, never block the master list.

## Data model assumptions

Existing tables (no schema changes):
- `memories(id, content, source, repo, machine_id, importance, captured_at, embedding, tsv, meta jsonb)` — meta carries `in_cluster`, `superseded_by`, `shadow_marked_at`, `pinned`, `last_napped_at`, `related_to[]`.
- `_ops.clusters(id, summary, last_window_at, …)` (or wherever cluster summaries live; verify on the server side and adapt).
- `_ops.api_keys` already joined for `machine_name` (we did this for /machines).

If any cluster summary field doesn't exist yet, the design tolerates it — `summary` becomes `null`, the UI just shows "(no summary)".

## Error handling

- All five server endpoints catch DB errors, log via `Logger.warn`, return `c.json({ error: "…" }, 500)`.
- Daemon proxies catch network errors, return `502`. Forward upstream non-200 status codes verbatim with body.
- React `apiGet` throws `ApiError`; panel catches and routes into `error` / `stale` state.
- AbortError on cancelled search is silently dropped (no error UI).

## Testing

- **Manual smoke** — open dashboard, verify default 7d view loads, filter chips work, search returns results, each tab fetches lazily, infinite scroll triggers near bottom.
- **Endpoint smoke** — `curl /api/_ops/memories?limit=5`, `/related`, `/supersede-chain`, `/capture`, `/clusters`. Confirm shapes match.
- **No `bun test` for v1.** Observe-only panel; if API breaks, panel surfaces error state. Unit tests deferred to v2 if write actions land.

## Out of scope

- Write actions (archive, pin, supersede manually).
- Graph view (separate panel, separate ticket follow-up).
- Mobile / narrow-viewport layout (dashboard is desktop-only).
- Memory-detail standalone page / route — inline expand suffices.

## Migration / cutover

No schema changes; no migration. New endpoints land additive on the server. New panel mounts under MachinesPanel in `App.tsx`. Plugin version bump on the next push (e.g. 1.0.86 → 1.0.87) so `/plugin update mneme` on other machines pulls the new dashboard.

## Acceptance

- [ ] Five server endpoints land in `routes/ops.ts`, each `read`-scoped.
- [ ] Five daemon proxies under `/dashboard/api/`.
- [ ] React components in `dashboard/src/components/` per the structure above.
- [ ] Default 7d cross-machine view loads on panel open.
- [ ] Filter chips refilter from offset 0.
- [ ] Hybrid search returns ranked results (embed + ts_rank).
- [ ] Inline expand opens four tabs, each fetching lazily on first open.
- [ ] Group-by-cluster toggle inserts cluster header rows.
- [ ] Infinite scroll fetches next batch near viewport bottom.
- [ ] All four panel-level states (loading / empty / error / stale) wired.
- [ ] Bundle size delta under 60KB raw / 20KB gzipped.

## Risks

- **Hybrid search latency.** First search call eats an embedder round-trip (~50-200ms). Mitigation: debounce the search input 300ms, show inline spinner.
- **`_ops.clusters` schema drift.** If summary field doesn't exist, the API silently nulls it; UI tolerates. Verify before implementation.
- **Statement timeout on broad queries.** A `q + all-time + all-machines` query might be expensive. Mitigation: enforce `since` defaults server-side (fall back to now-30d if missing) and `LIMIT` cap at 200.
- **Bundle bloat.** Adding many small components is fine; the existing shadcn primitives + Base UI Select keep the new surface small.
