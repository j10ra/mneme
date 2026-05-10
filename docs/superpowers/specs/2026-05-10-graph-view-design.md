# Graph view — design

Date: 2026-05-10
Status: approved
Closes the fourth (and last) major acceptance item of #32 — the dashboard ticket.

## Goal

A node-link graph of the memory corpus, surfaced as a third top-level tab in the dashboard sidebar. Lets the operator see the *shape* of the memory ecosystem: which ideas are dense with neighbors, which clusters are cohesive, where supersede chains are pruning. Read-only v1.

## Scope

- **Browse the landscape.** Renders the densest subgraph of memories with their `related_to` neighbors, supersede arrows, and cluster groupings.
- **Cap at top-N most-connected** memories (default 300, max 1000). Avoids the 7,538-node cliff and keeps the canvas readable.
- **Independent filter state** from the Memories tab. Each surface can be configured separately; no shared Zustand-style global.
- **Cytoscape.js, lazy-loaded.** Only pulled in when the Graph tab is first opened — zero impact on initial bundle for users who never click in.

Out of scope for v1: 3D rendering, edge bundling, server-side layout, write actions (manual cluster, archive), persistence of camera position across reloads, multi-select.

## Layout

Inside the existing dashboard right-column card:

```
┌─ filter strip ──────────────────────────────────────┐
│ [search]  [time]  [kind chips]  [layout dropdown]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│         ●──●     ┌─cluster───┐                      │
│          ╲ ╲     │  ●  ●  ●  │                      │
│           ●      │     ●     │                      │
│                  └───────────┘                      │
│                                                     │
├─ footer ────────────────────────────────────────────┤
│ 247 nodes · 612 edges · fcose layout                │
└─────────────────────────────────────────────────────┘
```

Right detail drawer (~360px) slides in over the canvas when a node is selected. Reuses `MemoryExpand.tsx` so the four sub-tabs (Content+Meta, Related, Chain, Cluster+Capture) work identically to the Memories table.

## Visual encoding

| Element | Encoding |
|---|---|
| Node color | `kind` — same palette as Memories row chips (decision sky, discovery violet, feature emerald, bugfix amber, security_alert red, etc.) |
| Node size | `importance` linear from 6px (0.0) → 16px (1.0) |
| Node border | selected = sky ring; superseded = dashed muted; pinned = success ring |
| Cluster grouping | cytoscape compound parent box per `meta.in_cluster`; theme/centroid memory rendered with thicker border. "Flatten clusters" toggle in layout picker |
| `related_to` edge | thin gray, 1px |
| `superseded_by` edge | directed arrow, amber, dashed |
| Hover tooltip | kind + first 80 chars of content |
| Search | matching nodes opaque, others dimmed to 0.2 opacity, pan to centroid of matches |

## Server endpoint

New, read-scoped, on `packages/server/src/routes/ops.ts`:

```
GET /api/_ops/graph
    ?since=&until=                  ISO; defaults to (now - 30d, now)
    &repo=&machine_id=&kind=        comma-sep multi (same shape as /memories)
    &top_n=                         max nodes; default 300, cap 1000
  → {
      nodes: [{
        id,                       UUID
        content_preview,          left(content, 200)
        kind,                     'decision' | 'discovery' | …
        importance,               real
        cluster_id,               nullable; meta->>'in_cluster'
        superseded,               bool; meta ? 'superseded_by'
        machine_id, machine_name
      }],
      edges: [{
        source, target,           memory ids, both in `nodes`
        type: 'related' | 'supersede'
      }],
      stats: { node_count, edge_count, total_in_window }
    }
```

**Top-N algorithm** (single SQL roundtrip, sub-second target):

1. CTE `candidates`: SELECT memories within filter window + filters.
2. CTE `ranked`: compute `edge_count = jsonb_array_length(meta->'related_to') + (meta ? 'superseded_by')::int`. ORDER BY edge_count DESC, importance DESC. LIMIT top_n.
3. SELECT nodes from `ranked` with the requested columns + machine_name join (LATERAL on api_keys, same pattern as /memories).
4. Edges:
   - **related_to**: unnest `meta->'related_to'`, INNER JOIN against `ranked` so we keep only edges where both endpoints made the cut.
   - **supersede**: same — only emit when `meta->>'superseded_by'` is in `ranked`.
5. Stats counts the unfiltered window for context.

Statement-timeout-friendly: top-n cap + ranked CTE means at most ~1000 nodes processed; edge unnest fans out but stays bounded by `top_n × related_to_avg_size` ≈ 6000 max.

## Daemon proxy

`packages/daemon/src/routes/dashboard.ts` adds:

```
GET /dashboard/api/graph[?...]
```

Plain passthrough via the existing `forwardQuery()` helper using `cfg.auth.key`.

## React components

```
packages/plugin/dashboard/src/components/
└─ GraphPanel.tsx                  top-level: filter state + fetch
   ├─ GraphFilters.tsx             search + time + kind chips + layout picker
   ├─ GraphCanvas.tsx              cytoscape mount via dynamic import
   ├─ GraphFooter.tsx              node/edge count + layout name
   └─ GraphDetailDrawer.tsx        right slide-in drawer; reuses <MemoryExpand>
```

State (panel-level):
- `filters: Filters` — same shape as `MemoriesPanel` filters; independent slice
- `query: string` (debounced 300ms)
- `topN: number` (default 300)
- `layout: 'fcose' | 'cola' | 'circle' | 'grid'` (default `fcose`)
- `selectedId: string | null` — opens drawer
- `data: { nodes, edges, stats } | null`
- `state: loading | ok | stale | error`

`GraphCanvas.tsx` does `const cy = await import("cytoscape")` + `await import("cytoscape-fcose")` inside a one-shot `useEffect`. Stores the loaded modules in a ref. Renders a Skeleton until ready. On data updates, calls `cy.elements().remove(); cy.add(elements); cy.layout({ name: layout }).run();`.

Search filter applied via `cy.batch(() => cy.elements().style('opacity', /* dim or full */))`.

## Wire into App.tsx

Sidebar gets a third icon (Network or `Workflow` from lucide-react). Mounted as a third TabsTab/TabsPanel. No layout changes to the existing two tabs.

## Defaults

| | default |
|---|---|
| Time range | last 30d (graph benefits from a longer window than the Memories table's 7d) |
| top_n | 300 |
| Layout | fcose (force-directed, organic, fast) |
| Cluster compound | on |
| Selected | none |
| Search | empty |

## State contract

Same as Status / Machines / Memories: `loading | ok | stale | error`. Cytoscape lazy-load failure → `error` with retry button. Per-graph fetch is debounced + AbortController-cancelled on filter change.

## Bundle impact

- cytoscape core: ~150KB raw / ~50KB gzipped
- cytoscape-fcose: ~40KB raw / ~14KB gzipped
- All lazy-loaded via `import()`, so initial bundle stays at current 478KB raw / ~145KB gzipped. The Graph chunk only downloads when the tab is opened.

## Out of scope

- 3D rendering / WebGL
- Server-side layout (cytoscape runs the layout in-browser; fcose is fast enough for 300 nodes)
- Camera position persistence across page reloads
- Multi-select / lasso
- Edge bundling (try if related_to renders too noisy in real data)
- Write actions (archive, manual cluster, manual supersede)

## Risks

- **Edge density.** With 300 nodes and avg 6 related_to per node, ~1800 edges. Could feel busy. Mitigation: show a "thin edges only" toggle if it's overwhelming; cytoscape can also bundle visually similar edges.
- **Cluster compound layout pain.** fcose handles compound nodes but they can interact with force-directed layout in non-obvious ways. Mitigation: provide flat layout (no compounds) as a fallback.
- **Lazy-load UX.** First click on the Graph tab pays the cytoscape download (~50KB gz). On a slow connection that's a perceptible pause. Mitigation: skeleton + small "loading visualization library…" hint while loading.

## Acceptance

- [ ] Server endpoint `/api/_ops/graph` with top-N edge ranking
- [ ] Daemon proxy `/dashboard/api/graph`
- [ ] Five React files under `components/` per the structure above
- [ ] Sidebar gets a third icon; tab renders without breaking Activity / Memories
- [ ] Default 30d / top 300 / fcose layout opens on first click
- [ ] Cytoscape lazy-loaded (verify in network tab — chunk only fetched when tab is opened)
- [ ] Click a node → drawer opens with reused MemoryExpand tabs
- [ ] Loading / empty / error / stale states wired
- [ ] Bundle size delta on initial chunk: ≤ 5KB raw (just the GraphPanel React shell + dynamic import setup)
