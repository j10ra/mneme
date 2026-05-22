# Worker Pagination + Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `nap`, `dream`, and `digest` reliably weave the entire memory corpus on a bounded round-robin instead of repeatedly re-scanning the newest ~1 day.

**Architecture:** Each worker gets a `meta` jsonb watermark (`last_dreamed_at` / `last_digested_at`) mirroring the existing `meta.last_napped_at` pattern: select least-recently-visited rows first (`NULLS FIRST`), stamp every row considered. Dream additionally includes neighbor content so a cluster forms from one seed. nap is split out of its single ~60s transaction. A latent digest cluster-merge bug that strands members on superseded clusters is fixed last.

**Tech Stack:** Bun, TypeScript, Postgres (postgres.js `sql` tag), pgvector HNSW. Tests run with `bun test`; DB-backed tests skip when `DATABASE_URL` is unset (auto-loaded from `.env`).

**Spec:** `docs/superpowers/specs/2026-05-22-worker-pagination-reliability-design.md`

---

## File map

| File | Change |
|---|---|
| `migrations/0027_worker_watermark_indexes.sql` | Create. Partial functional indexes for both watermarks. |
| `migrations/0028_repair_stranded_in_cluster.sql` | Create. One-time data repair. |
| `packages/server/src/routes/dream.ts` | Modify. Watermark seed order, `stampDreamedSeeds`, `assembleRepos`, neighbor content. |
| `packages/server/src/worker/digest.ts` | Modify. `selectDigestClusterWindow`, watermark ordering, `stampDigested`, `loadCluster` superseded filter. |
| `packages/server/src/worker/nap.ts` | Modify. `forEachIdBatch`, transaction split, batched decay. |
| `packages/server/src/infra/config.ts` | Modify. Add `DIGEST_MERGE_WINDOW`. |
| `packages/server/tests/dream-server.test.ts` | Modify. Add `stampDreamedSeeds` + `assembleRepos` tests. |
| `packages/server/tests/digest.test.ts` | Create. `stampDigested`, `selectDigestClusterWindow`, `loadCluster` tests. |
| `packages/server/tests/nap.test.ts` | Create. `forEachIdBatch` tests. |

**No daemon change.** Neighbor-inclusion keeps the wire field name `seeds`; the daemon's `runDreamCycle` already builds union-find components over every node in `seeds`, so once the server puts neighbor rows into that array the daemon clusters them with no edit. No plugin version bump.

---

# Part A — Dream: watermark + neighbor-inclusion

### Task A1: Migration 0027 — watermark indexes

**Files:**
- Create: `migrations/0027_worker_watermark_indexes.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Round-robin watermark indexes for the dream and digest workers.
--
-- Both workers paginate by selecting least-recently-visited rows first
-- and stamping a meta timestamp on every row considered. Same pattern
-- and rationale as migration 0019 (nap's meta.last_napped_at): ISO-8601
-- timestamp strings sort lexically the same as chronologically, so the
-- raw meta->>'...' text expression is indexed directly with no
-- non-IMMUTABLE ::timestamptz cast.
--
-- last_dreamed_at: dream's seed selection filters archived_at IS NULL
-- AND embedding IS NOT NULL, so the partial index matches that predicate.
--
-- last_digested_at: serves both digest operations -- Op1 scans cluster
-- rows, Op2 scans member rows -- so the partial index is keyed only on
-- archived_at IS NULL.

CREATE INDEX IF NOT EXISTS memories_last_dreamed_at_idx
  ON memories (
    (meta->>'last_dreamed_at') NULLS FIRST,
    created_at
  )
  WHERE archived_at IS NULL AND embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS memories_last_digested_at_idx
  ON memories (
    (meta->>'last_digested_at') NULLS FIRST,
    created_at
  )
  WHERE archived_at IS NULL;
```

- [ ] **Step 2: Dry-run the migration**

Run: `bun run migrate:dry`
Expected: output lists `0027_worker_watermark_indexes.sql` as pending, no errors.

- [ ] **Step 3: Apply the migration**

Run: `bun run migrate`
Expected: `0027_worker_watermark_indexes.sql` applied, exit 0.

- [ ] **Step 4: Verify the indexes exist**

Run: `set -a && source .pg.env && set +a && psql "$DATABASE_URL" -c "\di memories_last_dreamed_at_idx memories_last_digested_at_idx"`
Expected: both indexes listed.

- [ ] **Step 5: Commit**

```bash
git add migrations/0027_worker_watermark_indexes.sql
git commit -m "(feat): add worker watermark indexes for dream + digest round-robin"
```

---

### Task A2: `stampDreamedSeeds`

**Files:**
- Modify: `packages/server/src/routes/dream.ts`
- Test: `packages/server/tests/dream-server.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside the `describe.skipIf(!HAS_DB)` block in `dream-server.test.ts`:

```ts
test("stampDreamedSeeds writes meta.last_dreamed_at on the given ids", async () => {
  const { stampDreamedSeeds } = await import("../src/routes/dream.ts");
  const { sql } = await import("../src/infra/db.ts");

  const captureId = "00000000-0000-0000-0000-00000000d0ca";
  const idA = "00000000-0000-0000-0000-00000000d0a1";
  const idB = "00000000-0000-0000-0000-00000000d0b2";

  try {
    await sql`
      INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
      VALUES (${captureId}, 'seed', ${`sha-${captureId}`}, 'test',
              '00000000-0000-0000-0000-00000000d001', 'testhost', 'test')
    `;
    for (const id of [idA, idB]) {
      await sql`
        INSERT INTO memories (id, capture_id, chunk_id, content, content_hash,
          embedding_model, kind, machine_id, harness)
        VALUES (${id}, ${captureId}, ${`chunk-${id}`}, ${`c ${id}`}, ${`hash-${id}`},
          'test', 'note', '00000000-0000-0000-0000-00000000d001', 'test')
      `;
    }

    await stampDreamedSeeds([idA, idB]);

    const rows = await sql<{ id: string; stamped: string | null }[]>`
      SELECT id::text AS id, meta->>'last_dreamed_at' AS stamped
      FROM memories WHERE id = ANY(${[idA, idB]})
    `;
    for (const r of rows) expect(r.stamped).not.toBeNull();
  } finally {
    const { sql } = await import("../src/infra/db.ts");
    await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
    await sql`DELETE FROM captures WHERE id = ${captureId}`;
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/server/tests/dream-server.test.ts -t "stampDreamedSeeds"`
Expected: FAIL with `stampDreamedSeeds is not a function` (export missing).

- [ ] **Step 3: Implement `stampDreamedSeeds`**

Add to `packages/server/src/routes/dream.ts`, after `fetchDreamCandidates`:

```ts
/** Stamp meta.last_dreamed_at = now() on the given seed ids. Called by
 *  the candidates route once per dream cycle so the next cycle's
 *  watermark-ordered seed selection advances past these rows. Stamping
 *  at fetch time (not cluster-write time) is crash-safe: a daemon that
 *  dies mid-cycle does not lose the stamp. */
export async function stampDreamedSeeds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await sql`
    UPDATE memories
    SET meta = jsonb_set(COALESCE(meta, '{}'::jsonb),
                         '{last_dreamed_at}', to_jsonb(now()::text))
    WHERE id = ANY(${ids})
  `;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/server/tests/dream-server.test.ts -t "stampDreamedSeeds"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routes/dream.ts packages/server/tests/dream-server.test.ts
git commit -m "(feat): add stampDreamedSeeds for dream round-robin watermark"
```

---

### Task A3: `assembleRepos` pure helper

**Files:**
- Modify: `packages/server/src/routes/dream.ts`
- Test: `packages/server/tests/dream-server.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `dream-server.test.ts`, OUTSIDE the `describe.skipIf` block (this is a pure function, no DB):

```ts
import { describe as describe2, expect as expect2, test as test2 } from "bun:test";

describe2("assembleRepos", () => {
  test2("includes neighbor content in seeds and preserves edges", async () => {
    const { assembleRepos } = await import("../src/routes/dream.ts");
    const repos = assembleRepos(
      [
        { id: "s1", repo: "r", neighbor_id: "n1", content: "seed one",
          kind: "note", created_at: new Date("2026-01-01T00:00:00Z") },
        { id: "s2", repo: "r", neighbor_id: null, content: "seed two",
          kind: "note", created_at: new Date("2026-01-02T00:00:00Z") },
      ],
      [
        { id: "n1", repo: "r", content: "neighbor one",
          kind: "decision", created_at: new Date("2026-01-03T00:00:00Z") },
      ],
    );
    const ids = repos.r!.seeds.map((s) => s.id).sort();
    expect2(ids).toEqual(["n1", "s1", "s2"]);
    expect2(repos.r!.edges).toContainEqual(["s1", "n1"]);
    const n1 = repos.r!.seeds.find((s) => s.id === "n1")!;
    expect2(n1.content).toBe("neighbor one");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/server/tests/dream-server.test.ts -t "assembleRepos"`
Expected: FAIL with `assembleRepos is not a function`.

- [ ] **Step 3: Implement `assembleRepos`**

In `packages/server/src/routes/dream.ts`, add a `NeighborRow` type next to `EdgeRow`:

```ts
type NeighborRow = {
  id: string;
  repo: string | null;
  content: string;
  kind: string;
  created_at: Date;
};
```

Then add the pure helper after the type declarations:

```ts
/** Build the per-repo candidate map from the seed+edge scan rows plus
 *  the separately-fetched neighbor rows. Seeds and neighbors both land
 *  in `seeds` (the daemon treats every entry as a cluster-eligible
 *  node); the field keeps its name for wire compatibility with
 *  already-deployed daemons. Pure -- no DB access. */
export function assembleRepos(
  edgeRows: EdgeRow[],
  neighborRows: NeighborRow[],
): DreamCandidates["repos"] {
  const repos: DreamCandidates["repos"] = {};
  const seen = new Set<string>();

  const addMemory = (
    repoKey: string,
    m: { id: string; content: string; kind: string; created_at: Date },
  ): void => {
    repos[repoKey] ??= { seeds: [], edges: [] };
    if (seen.has(m.id)) return;
    repos[repoKey]!.seeds.push({
      id: m.id,
      content: m.content,
      kind: m.kind,
      created_at: m.created_at.toISOString(),
    });
    seen.add(m.id);
  };

  for (const row of edgeRows) {
    const repoKey = row.repo ?? "__none__";
    addMemory(repoKey, row);
    if (row.neighbor_id) {
      repos[repoKey]!.edges.push([row.id, row.neighbor_id]);
    }
  }
  for (const n of neighborRows) {
    addMemory(n.repo ?? "__none__", n);
  }
  return repos;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/server/tests/dream-server.test.ts -t "assembleRepos"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routes/dream.ts packages/server/tests/dream-server.test.ts
git commit -m "(feat): add assembleRepos to fold neighbor content into dream candidates"
```

---

### Task A4: Rewrite `fetchDreamCandidates` + wire the route

**Files:**
- Modify: `packages/server/src/routes/dream.ts`

- [ ] **Step 1: Replace `fetchDreamCandidates`**

Replace the entire `fetchDreamCandidates` function body. Keep the doc comment about the inlined-predicate / HNSW reasoning. The two changes: the seeds CTE `ORDER BY`, and a second query that fetches neighbor content. The function now returns the candidates plus the seed ids to stamp.

```ts
export async function fetchDreamCandidates(
  windowKey: number,
  machineId: string,
): Promise<{ candidates: DreamCandidates; seedIds: string[] }> {
  // Inlined predicates (no CTE materialization) keep pgvector's HNSW
  // index usable on the LATERAL's cosine ORDER BY -- see git history
  // for why a materialized CTE times out at Railway's gateway.
  //
  // Seed selection is now a round-robin: least-recently-dreamed rows
  // first (NULLS FIRST drains never-dreamed rows), so every memory is
  // eventually a seed regardless of age. Backed by
  // memories_last_dreamed_at_idx (migration 0027).
  const edgeRows = await sql<EdgeRow[]>`
    WITH seeds AS (
      SELECT id, repo, embedding, content, kind, created_at
      FROM memories
      WHERE archived_at IS NULL
        AND embedding IS NOT NULL
        AND kind <> 'cluster'
        AND (private = false OR machine_id = ${machineId})
        AND NOT COALESCE((meta->>'pinned')::boolean, false)
        AND (meta->>'shadow_of') IS NULL
        AND (meta->>'superseded_by') IS NULL
        AND (meta->>'in_cluster') IS NULL
      ORDER BY meta->>'last_dreamed_at' NULLS FIRST, created_at ASC
      LIMIT ${DREAM_MAX_CANDIDATES_PER_CYCLE}
    )
    SELECT
      s.id, s.repo, s.content, s.kind, s.created_at,
      n.neighbor_id
    FROM seeds s
    LEFT JOIN LATERAL (
      SELECT m.id AS neighbor_id
      FROM memories m
      WHERE m.archived_at IS NULL
        AND m.embedding IS NOT NULL
        AND m.kind <> 'cluster'
        AND (m.private = false OR m.machine_id = ${machineId})
        AND NOT COALESCE((m.meta->>'pinned')::boolean, false)
        AND (m.meta->>'shadow_of') IS NULL
        AND (m.meta->>'superseded_by') IS NULL
        AND (m.meta->>'in_cluster') IS NULL
        AND m.repo IS NOT DISTINCT FROM s.repo
        AND m.id <> s.id
        AND s.embedding <=> m.embedding < ${DREAM_CLUSTER_DISTANCE}
      ORDER BY s.embedding <=> m.embedding
      LIMIT ${DREAM_MAX_NEIGHBORS_PER_MEMORY}
    ) n ON true
  `;

  const seedIds = [...new Set(edgeRows.map((r) => r.id))];
  const seedIdSet = new Set(seedIds);
  const neighborIds = [
    ...new Set(
      edgeRows
        .map((r) => r.neighbor_id)
        .filter((nid): nid is string => nid !== null && !seedIdSet.has(nid)),
    ),
  ];

  // Neighbors that are not themselves seeds still need full content so
  // the daemon can distill a cluster that includes them. One extra
  // fetch by id -- the LATERAL already applied every eligibility filter.
  const neighborRows = neighborIds.length
    ? await sql<NeighborRow[]>`
        SELECT id, repo, content, kind, created_at
        FROM memories
        WHERE id = ANY(${neighborIds})
      `
    : [];

  return {
    candidates: { window_key: windowKey, repos: assembleRepos(edgeRows, neighborRows) },
    seedIds,
  };
}
```

- [ ] **Step 2: Update the `/api/dream/candidates` route handler**

In `mountDreamRoutes`, the `app.get("/api/dream/candidates", ...)` handler currently ends with:

```ts
      const candidates = await fetchDreamCandidates(windowKey, auth.machineId);
      return c.json(candidates);
```

Replace those two lines with:

```ts
      const { candidates, seedIds } = await fetchDreamCandidates(windowKey, auth.machineId);
      await stampDreamedSeeds(seedIds);
      return c.json(candidates);
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS, no errors. (Confirms the new return shape is consumed correctly and no other caller of `fetchDreamCandidates` broke.)

- [ ] **Step 4: Run the dream test suites**

Run: `bun test packages/server/tests/dream-server.test.ts packages/daemon/tests/dream.test.ts`
Expected: PASS. The daemon suite confirms the unchanged `seeds` wire field still drives `runDreamCycle` correctly.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routes/dream.ts
git commit -m "(feat): dream weaves whole corpus via watermark seeds + neighbor inclusion"
```

---

# Part B — Digest: watermark on Op1 + Op2

### Task B1: Export digest internals + add `stampDigested`

**Files:**
- Modify: `packages/server/src/worker/digest.ts`
- Test: `packages/server/tests/digest.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/server/tests/digest.test.ts`:

```ts
// Digest worker SQL smoke tests. Seed isolated rows under a
// deterministic capture_id, assert, tear down. Skipped without a DB.

import { describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("digest (requires DATABASE_URL)", () => {
  test("stampDigested writes meta.last_digested_at on the given ids", async () => {
    const { stampDigested } = await import("../src/worker/digest.ts");
    const { sql } = await import("../src/infra/db.ts");

    const captureId = "00000000-0000-0000-0000-0000000e0dca";
    const idA = "00000000-0000-0000-0000-0000000e0da1";

    try {
      await sql`
        INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
        VALUES (${captureId}, 'seed', ${`sha-${captureId}`}, 'test',
                '00000000-0000-0000-0000-0000000e0d01', 'testhost', 'test')
      `;
      await sql`
        INSERT INTO memories (id, capture_id, chunk_id, content, content_hash,
          embedding_model, kind, machine_id, harness)
        VALUES (${idA}, ${captureId}, ${`chunk-${idA}`}, 'c', ${`hash-${idA}`},
          'test', 'note', '00000000-0000-0000-0000-0000000e0d01', 'test')
      `;

      await stampDigested([idA]);

      const [row] = await sql<{ stamped: string | null }[]>`
        SELECT meta->>'last_digested_at' AS stamped FROM memories WHERE id = ${idA}
      `;
      expect(row?.stamped).not.toBeNull();
    } finally {
      const { sql } = await import("../src/infra/db.ts");
      await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
      await sql`DELETE FROM captures WHERE id = ${captureId}`;
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/server/tests/digest.test.ts -t "stampDigested"`
Expected: FAIL with `stampDigested is not a function`.

- [ ] **Step 3: Add `stampDigested` and export the functions to be tested**

In `packages/server/src/worker/digest.ts`, add after `applySupersede`:

```ts
/** Stamp meta.last_digested_at = now() on the given ids. Used for both
 *  digest operations -- Op1 stamps cluster rows, Op2 stamps member rows
 *  -- so each cycle's round-robin advances past the rows it considered. */
export async function stampDigested(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await sql`
    UPDATE memories
    SET meta = jsonb_set(COALESCE(meta, '{}'::jsonb),
                         '{last_digested_at}', to_jsonb(now()::text))
    WHERE id = ANY(${ids})
  `;
}
```

Then add the `export` keyword to these existing declarations: `findMergePairs`, `loadCluster`, `findCrossClusterSupersedeCandidates`. (They are needed by tests in later tasks; exporting is a no-op for behavior.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/server/tests/digest.test.ts -t "stampDigested"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/worker/digest.ts packages/server/tests/digest.test.ts
git commit -m "(feat): add stampDigested + export digest internals for testing"
```

---

### Task B2: `selectDigestClusterWindow` (Op1 watermark)

**Files:**
- Modify: `packages/server/src/worker/digest.ts`
- Modify: `packages/server/src/infra/config.ts`
- Test: `packages/server/tests/digest.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside the `describe.skipIf` block in `digest.test.ts`:

```ts
test("selectDigestClusterWindow returns never-digested clusters before stale ones", async () => {
  const { selectDigestClusterWindow } = await import("../src/worker/digest.ts");
  const { sql } = await import("../src/infra/db.ts");

  const captureId = "00000000-0000-0000-0000-0000000e1dca";
  const fresh = "00000000-0000-0000-0000-0000000e1d01"; // has last_digested_at
  const never = "00000000-0000-0000-0000-0000000e1d02"; // no watermark

  try {
    await sql`
      INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
      VALUES (${captureId}, 'seed', ${`sha-${captureId}`}, 'test',
              '00000000-0000-0000-0000-0000000e1d99', 'testhost', 'test')
    `;
    const insertCluster = async (id: string, meta: string) => {
      await sql`
        INSERT INTO memories (id, capture_id, chunk_id, content, content_hash,
          embedding_model, kind, machine_id, harness, meta)
        VALUES (${id}, ${captureId}, ${`chunk-${id}`}, 'cluster summary', ${`hash-${id}`},
          'test', 'cluster', '00000000-0000-0000-0000-0000000e1d99', 'test', ${meta}::jsonb)
      `;
    };
    await insertCluster(fresh, '{"last_digested_at":"2999-01-01T00:00:00.000Z"}');
    await insertCluster(never, "{}");

    const window = await selectDigestClusterWindow(10_000);
    expect(window.indexOf(never)).toBeGreaterThanOrEqual(0);
    expect(window.indexOf(never)).toBeLessThan(window.indexOf(fresh));
  } finally {
    const { sql } = await import("../src/infra/db.ts");
    await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
    await sql`DELETE FROM captures WHERE id = ${captureId}`;
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/server/tests/digest.test.ts -t "selectDigestClusterWindow"`
Expected: FAIL with `selectDigestClusterWindow is not a function`.

- [ ] **Step 3: Add the `DIGEST_MERGE_WINDOW` constant**

In `packages/server/src/infra/config.ts`, immediately after `DIGEST_MAX_MERGE_PAIRS`:

```ts
/** How many clusters one digest cycle pulls into its merge round-robin,
 *  least-recently-digested first. Every cluster in the window is stamped
 *  meta.last_digested_at, so the cluster set is fully woven over a few
 *  cycles regardless of how large the cluster population grows. */
export const DIGEST_MERGE_WINDOW = 100;
```

- [ ] **Step 4: Implement `selectDigestClusterWindow`**

In `packages/server/src/worker/digest.ts`, add the import of the new constant to the existing `config.ts` import block, then add the function before `findMergePairs`:

```ts
/** The merge round-robin window: the DIGEST_MERGE_WINDOW
 *  least-recently-digested non-superseded clusters. No embedding filter
 *  -- a null-embedding cluster simply yields no merge pairs and is still
 *  stamped, which is correct. */
export async function selectDigestClusterWindow(limit: number): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    SELECT id::text AS id
    FROM memories
    WHERE kind = 'cluster'
      AND archived_at IS NULL
      AND (meta->>'superseded_by') IS NULL
    ORDER BY meta->>'last_digested_at' NULLS FIRST, created_at ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}
```

- [ ] **Step 5: Run the test to verify it passes, then commit**

Run: `bun test packages/server/tests/digest.test.ts -t "selectDigestClusterWindow"`
Expected: PASS.

```bash
git add packages/server/src/worker/digest.ts packages/server/src/infra/config.ts packages/server/tests/digest.test.ts
git commit -m "(feat): add digest cluster-merge round-robin window"
```

---

### Task B3: Wire Op1 to the window + stamp it

**Files:**
- Modify: `packages/server/src/worker/digest.ts`

- [ ] **Step 1: Rewrite `findMergePairs` to scan the window**

Replace the entire `findMergePairs` function:

```ts
/** Merge-pair candidates: cluster pairs at cosine < DIGEST_MERGE_DISTANCE
 *  where side `a` is in this cycle's round-robin window. Side `b` is any
 *  non-superseded cluster, so a stale-window cluster still pairs with a
 *  fresh one. Unordered pairs are de-duplicated in TS because the
 *  windowed scan cannot use the old `b.id > a.id` trick. */
export async function findMergePairs(windowIds: string[]): Promise<MergePairRow[]> {
  if (windowIds.length === 0) return [];
  const rows = (await sql<MergePairRow[]>`
    SELECT a.id::text AS a_id, b.id::text AS b_id
    FROM memories a
    JOIN memories b
      ON b.id <> a.id
        AND b.kind = 'cluster' AND b.archived_at IS NULL
        AND b.embedding IS NOT NULL
        AND b.repo IS NOT DISTINCT FROM a.repo
        AND (b.meta->>'superseded_by') IS NULL
        AND a.embedding <=> b.embedding < ${DIGEST_MERGE_DISTANCE}
    WHERE a.id = ANY(${windowIds})
      AND a.embedding IS NOT NULL
    ORDER BY a.embedding <=> b.embedding ASC
    LIMIT ${DIGEST_MAX_MERGE_PAIRS}
  `) as MergePairRow[];

  const seen = new Set<string>();
  const deduped: MergePairRow[] = [];
  for (const r of rows) {
    const key = [r.a_id, r.b_id].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }
  return deduped;
}
```

- [ ] **Step 2: Update `runDigestOnce` Operation 1**

In `runDigestOnce`, the Operation 1 block currently starts:

```ts
  // ─── Operation 1: cluster merge ─────────────────────────────────
  const mergePairs = await findMergePairs();
  let mergesApplied = 0;
```

Replace those three lines with:

```ts
  // ─── Operation 1: cluster merge ─────────────────────────────────
  const mergeWindow = await selectDigestClusterWindow(DIGEST_MERGE_WINDOW);
  const mergePairs = await findMergePairs(mergeWindow);
  let mergesApplied = 0;
```

Then, immediately after the `for (const pair of mergePairs) { ... }` loop closes and before the `// ─── Operation 2` comment, add:

```ts
  // Stamp every cluster in this cycle's window, merged or not, so the
  // next cycle advances to the next-stalest clusters.
  await stampDigested(mergeWindow);
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS. (Confirms `findMergePairs` now requires its `windowIds` argument everywhere it is called.)

- [ ] **Step 4: Run the digest tests**

Run: `bun test packages/server/tests/digest.test.ts`
Expected: PASS (all digest tests).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/worker/digest.ts
git commit -m "(feat): digest Op1 merges over a watermarked cluster window"
```

---

### Task B4: Op2 watermark ordering + stamping

**Files:**
- Modify: `packages/server/src/worker/digest.ts`

- [ ] **Step 1: Add watermark ordering to `findCrossClusterSupersedeCandidates`**

The `SELECT DISTINCT` requires every `ORDER BY` expression in the select list. Replace the function's `SELECT` and add the `ORDER BY` / `LIMIT`. Replace the whole query inside `findCrossClusterSupersedeCandidates` with:

```ts
  return (await sql<CrossClusterCandidateRow[]>`
    SELECT DISTINCT
      a.id::text AS id,
      a.kind::text AS kind,
      a.content,
      a.created_at,
      a.meta->>'last_digested_at' AS last_digested_at
    FROM memories a
    JOIN memories b
      ON b.archived_at IS NULL
        AND b.embedding IS NOT NULL
        AND b.kind <> 'cluster'
        AND b.repo IS NOT DISTINCT FROM a.repo
        AND (b.meta->>'in_cluster') IS NOT NULL
        AND (a.meta->>'in_cluster') <> (b.meta->>'in_cluster')
        AND (b.meta->>'superseded_by') IS NULL
        AND NOT COALESCE((b.meta->>'pinned')::boolean, false)
        AND a.embedding <=> b.embedding < ${SUPERSEDE_LLM_ADJACENT_COSINE_MAX}
    WHERE a.archived_at IS NULL
      AND a.embedding IS NOT NULL
      AND a.kind <> 'cluster'
      AND (a.meta->>'in_cluster') IS NOT NULL
      AND (a.meta->>'superseded_by') IS NULL
      AND NOT COALESCE((a.meta->>'pinned')::boolean, false)
    ORDER BY a.meta->>'last_digested_at' NULLS FIRST, a.created_at ASC
    LIMIT ${DIGEST_MAX_SUPERSEDE_CANDIDATES}
  `) as CrossClusterCandidateRow[];
```

Then add the `last_digested_at` field to the `CrossClusterCandidateRow` type:

```ts
type CrossClusterCandidateRow = {
  id: string;
  kind: Kind;
  content: string;
  created_at: Date;
  last_digested_at: string | null;
};
```

- [ ] **Step 2: Stamp the Op2 candidates in `runDigestOnce`**

In `runDigestOnce`, the Operation 2 block currently starts:

```ts
  // ─── Operation 2: cross-cluster supersede ──────────────────────
  const candidates = await findCrossClusterSupersedeCandidates();
```

After the `for (const batch of chunk(candidates, ...)) { ... }` loop closes and before the `const result: DigestResult` line, add:

```ts
  // Stamp every candidate considered this cycle so the next cycle's
  // watermark-ordered scan advances to the next-stalest member rows.
  await stampDigested(candidates.map((c) => c.id));
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Run the digest tests**

Run: `bun test packages/server/tests/digest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/worker/digest.ts
git commit -m "(feat): digest Op2 scans cross-cluster supersede candidates round-robin"
```

---

# Part C — nap hardening

### Task C1: `forEachIdBatch` helper

**Files:**
- Modify: `packages/server/src/worker/nap.ts`
- Test: `packages/server/tests/nap.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/server/tests/nap.test.ts`:

```ts
// nap helper unit tests. forEachIdBatch is pure (injected deps), so
// these run with no DB.

import { describe, expect, test } from "bun:test";
import { forEachIdBatch } from "../src/worker/nap.ts";

describe("forEachIdBatch", () => {
  test("iterates every batch, advances the cursor, terminates on empty", async () => {
    const batches = [["a", "b"], ["c"]];
    const cursors: string[] = [];
    const applied: string[][] = [];

    const affected = await forEachIdBatch(
      2,
      (cursor) => {
        cursors.push(cursor);
        return Promise.resolve(batches.shift() ?? []);
      },
      (ids) => {
        applied.push(ids);
        return Promise.resolve(ids.length);
      },
    );

    expect(applied).toEqual([["a", "b"], ["c"]]);
    expect(affected).toBe(3);
    // first fetch uses the zero-uuid cursor, then the last id of each batch
    expect(cursors).toEqual([
      "00000000-0000-0000-0000-000000000000",
      "b",
      "c",
    ]);
  });

  test("returns 0 and never calls apply when the first fetch is empty", async () => {
    let applyCalls = 0;
    const affected = await forEachIdBatch(
      500,
      () => Promise.resolve([]),
      () => {
        applyCalls++;
        return Promise.resolve(0);
      },
    );
    expect(affected).toBe(0);
    expect(applyCalls).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/server/tests/nap.test.ts`
Expected: FAIL with `forEachIdBatch` import unresolved / not a function.

- [ ] **Step 3: Implement `forEachIdBatch`**

In `packages/server/src/worker/nap.ts`, add at the top of the file after the imports:

```ts
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

/** Keyset-paginate memory ids and apply a bounded UPDATE per batch.
 *  `fetchBatch` returns up to `batchSize` ids strictly greater than the
 *  cursor, ascending. `apply` runs the batch UPDATE and returns the
 *  number of rows it affected. Iterating in id order with a monotonic
 *  cursor guarantees termination and bounds every statement, so a
 *  full-table pass never scales toward the 120s statement_timeout.
 *  Pure control flow -- both callbacks are injected for testability. */
export async function forEachIdBatch(
  batchSize: number,
  fetchBatch: (cursor: string, limit: number) => Promise<string[]>,
  apply: (ids: string[]) => Promise<number>,
): Promise<number> {
  let cursor = ZERO_UUID;
  let affected = 0;
  for (;;) {
    const ids = await fetchBatch(cursor, batchSize);
    if (ids.length === 0) break;
    affected += await apply(ids);
    cursor = ids[ids.length - 1]!;
  }
  return affected;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/server/tests/nap.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/worker/nap.ts packages/server/tests/nap.test.ts
git commit -m "(feat): add forEachIdBatch keyset paginator for nap"
```

---

### Task C2: Split `runNapOnce` into phases with batched decay

**Files:**
- Modify: `packages/server/src/worker/nap.ts`

- [ ] **Step 1: Replace `runNapOnce` with the phased version**

Replace the entire `runNapOnce` export (the `mnemeFn(...)` block) with the following. The four phase helpers each own their transaction(s); the two decay passes are batched via `forEachIdBatch`; the shadow pass and the seed pass are each a single transaction. The relate and supersede SQL is unchanged from the current file -- copied verbatim into `napSeedPhase`.

```ts
const NAP_DECAY_BATCH = 5000;

/** Phase 1: importance decay, batched. Pinned rows floor at
 *  NAP_PIN_FLOOR, unpinned at NAP_FLOOR. Each batch UPDATE is its own
 *  statement, so no single statement scales with corpus size. */
async function napDecayImportance(): Promise<number> {
  return forEachIdBatch(
    NAP_DECAY_BATCH,
    async (cursor, limit) => {
      const rows = await sql<{ id: string }[]>`
        SELECT id::text AS id FROM memories
        WHERE archived_at IS NULL AND id > ${cursor}::uuid
        ORDER BY id LIMIT ${limit}
      `;
      return rows.map((r) => r.id);
    },
    async (ids) => {
      const r = await sql`
        UPDATE memories
        SET importance = GREATEST(
          CASE WHEN COALESCE((meta->>'pinned')::boolean, false)
               THEN ${NAP_PIN_FLOOR}::real ELSE ${NAP_FLOOR}::real END,
          importance * ${NAP_DECAY_PER_CYCLE}::real
        )
        WHERE id = ANY(${ids})
          AND importance > CASE
            WHEN COALESCE((meta->>'pinned')::boolean, false) THEN ${NAP_PIN_FLOOR}::real
            ELSE ${NAP_FLOOR}::real END
      `;
      return r.count;
    },
  );
}

/** Phase 1b: recall_weight (LTP) decay, batched. Fades use-driven
 *  reinforcement so weight reflects recent use; floors at 0.01. */
async function napDecayRecallWeight(): Promise<number> {
  return forEachIdBatch(
    NAP_DECAY_BATCH,
    async (cursor, limit) => {
      const rows = await sql<{ id: string }[]>`
        SELECT id::text AS id FROM memories
        WHERE archived_at IS NULL AND id > ${cursor}::uuid
        ORDER BY id LIMIT ${limit}
      `;
      return rows.map((r) => r.id);
    },
    async (ids) => {
      const r = await sql`
        UPDATE memories
        SET recall_weight = recall_weight * ${RECALL_LTD_DECAY}::real
        WHERE id = ANY(${ids}) AND recall_weight >= 0.01
      `;
      return r.count;
    },
  );
}

/** Phase 2: exact-text shadow-marking. Single statement in its own
 *  transaction. The UPDATE only touches rows in duplicate groups; the
 *  cost is the GROUP BY scan, which is fast. */
async function napShadowDuplicates(): Promise<number> {
  const shadowed = await sql`
    WITH groups AS (
      SELECT content_hash,
             COALESCE(repo, '__null__') AS repo_key,
             CASE WHEN private THEN machine_id ELSE 'public' END AS scope_key,
             (array_agg(id ORDER BY importance DESC, created_at DESC))[1] AS keeper_id
      FROM memories
      WHERE archived_at IS NULL
        AND (meta->>'shadow_of') IS NULL
      GROUP BY content_hash, COALESCE(repo, '__null__'),
               CASE WHEN private THEN machine_id ELSE 'public' END
      HAVING count(*) > 1
    )
    UPDATE memories m
    SET importance = m.importance * ${NAP_SHADOW_DECAY}::real,
        meta = m.meta || jsonb_build_object('shadow_of', g.keeper_id::text)
    FROM groups g
    WHERE m.content_hash = g.content_hash
      AND COALESCE(m.repo, '__null__') = g.repo_key
      AND CASE WHEN m.private THEN m.machine_id ELSE 'public' END = g.scope_key
      AND m.id <> g.keeper_id
      AND (m.meta->>'shadow_of') IS NULL
  `;
  return shadowed.count;
}

/** Phase 3: seed-bounded relate + rule-supersede + stamp. One
 *  transaction -- the three steps share the seed set and must see a
 *  consistent view. Already bounded by NAP_PER_CYCLE_CAP. */
async function napSeedPhase(): Promise<{ related: number; superseded: number }> {
  return sql.begin(async (tx) => {
    const seedRows = await tx<{ id: string }[]>`
      SELECT id FROM memories
      WHERE archived_at IS NULL AND embedding IS NOT NULL
      ORDER BY meta->>'last_napped_at' NULLS FIRST,
               created_at ASC
      LIMIT ${NAP_PER_CYCLE_CAP}
    `;
    const seedIds = seedRows.map((r) => r.id);

    const related =
      seedIds.length === 0
        ? { count: 0 }
        : await tx`
            WITH seeds AS (
              SELECT id, embedding, repo FROM memories WHERE id = ANY(${seedIds})
            ),
            neighbors AS (
              SELECT s.id AS a_id, n.id AS b_id
              FROM seeds s,
              LATERAL (
                SELECT m.id FROM memories m
                WHERE m.archived_at IS NULL
                  AND m.embedding IS NOT NULL
                  AND m.repo IS NOT DISTINCT FROM s.repo
                  AND m.id <> s.id
                  AND s.embedding <=> m.embedding < ${NAP_RELATE_DISTANCE}
                ORDER BY s.embedding <=> m.embedding
                LIMIT ${NAP_RELATE_MAX_NEIGHBORS}
              ) n
            ),
            mutual AS (
              SELECT a_id, b_id FROM neighbors
              UNION
              SELECT b_id, a_id FROM neighbors
            ),
            grouped AS (
              SELECT a_id, array_agg(DISTINCT b_id::text) AS new_related
              FROM mutual GROUP BY a_id
            )
            UPDATE memories m
            SET meta = jsonb_set(
              m.meta, '{related_to}',
              (
                SELECT to_jsonb(array_agg(DISTINCT v))
                FROM (
                  SELECT jsonb_array_elements_text(COALESCE(m.meta->'related_to', '[]'::jsonb)) AS v
                  UNION
                  SELECT unnest(g.new_related) AS v
                ) all_v
              )
            )
            FROM grouped g
            WHERE m.id = g.a_id AND m.archived_at IS NULL
          `;

    const supersededRows =
      seedIds.length === 0
        ? []
        : await tx<{ older_id: string; newer_id: string }[]>`
            WITH pairs AS (
              SELECT o.id AS older_id, n.newer_id
              FROM memories o
              CROSS JOIN LATERAL (
                SELECT m.id AS newer_id FROM memories m
                WHERE m.archived_at IS NULL
                  AND m.embedding IS NOT NULL
                  AND m.repo IS NOT DISTINCT FROM o.repo
                  AND m.id <> o.id
                  AND NOT COALESCE((m.meta->>'pinned')::boolean, false)
                  AND (m.meta->>'superseded_by') IS NULL
                  AND m.created_at > o.created_at + ${SUPERSEDE_RULE_AGE_GAP}::interval
                  AND m.content ILIKE ANY(${SUPERSEDE_RULE_KEYWORDS.map((k) => `%${k}%`)})
                  AND m.embedding <=> o.embedding < ${SUPERSEDE_RULE_COSINE_MAX}
                ORDER BY m.embedding <=> o.embedding ASC
                LIMIT 1
              ) n
              WHERE o.id = ANY(${seedIds})
                AND o.archived_at IS NULL
                AND o.embedding IS NOT NULL
                AND NOT COALESCE((o.meta->>'pinned')::boolean, false)
                AND (o.meta->>'superseded_by') IS NULL
              LIMIT ${SUPERSEDE_RULE_PER_CYCLE_CAP}
            )
            UPDATE memories m
            SET meta = m.meta || jsonb_build_object('superseded_by', p.newer_id::text)
            FROM pairs p
            WHERE m.id = p.older_id
            RETURNING p.older_id::text, p.newer_id::text
          `;

    if (seedIds.length > 0) {
      await tx`
        UPDATE memories
        SET meta = jsonb_set(COALESCE(meta, '{}'::jsonb),
                             '{last_napped_at}', to_jsonb(now()::text))
        WHERE id = ANY(${seedIds})
      `;
    }

    return { related: related.count, superseded: supersededRows.length };
  });
}

/** Run one nap cycle as four independent phases. No phase holds locks
 *  for the whole cycle, and a slow phase fails in isolation instead of
 *  rolling back the rest. */
export const runNapOnce = mnemeFn("worker.nap.once", async (): Promise<NapResult> => {
  const decayed = await napDecayImportance();
  const ltpDecayed = await napDecayRecallWeight();
  const shadowed = await napShadowDuplicates();
  const seed = await napSeedPhase();

  const result: NapResult = {
    decayed,
    ltp_decayed: ltpDecayed,
    shadowed,
    related: seed.related,
    superseded: seed.superseded,
  };
  Logger.info("nap: done", result);
  return result;
});
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS. (All `config.ts` imports — `NAP_*`, `RECALL_LTD_DECAY`, `SUPERSEDE_RULE_*` — are already imported at the top of `nap.ts`; no import changes needed.)

- [ ] **Step 3: Run the nap helper test**

Run: `bun test packages/server/tests/nap.test.ts`
Expected: PASS (`forEachIdBatch` tests still green).

- [ ] **Step 4: Smoke-run one nap cycle against the DB**

Run: `bun -e 'const {runNapOnce}=await import("./packages/server/src/worker/nap.ts"); console.log(await runNapOnce());'`
Expected: prints a `NapResult` object with numeric fields, no error. Confirms all four phases execute against the live schema.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/worker/nap.ts
git commit -m "(feat): split nap into phased transactions with batched decay"
```

---

# Part D — Stranded-member bug

### Task D1: `loadCluster` superseded filter

**Files:**
- Modify: `packages/server/src/worker/digest.ts`
- Test: `packages/server/tests/digest.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside the `describe.skipIf` block in `digest.test.ts`:

```ts
test("loadCluster returns null for a cluster already superseded", async () => {
  const { loadCluster } = await import("../src/worker/digest.ts");
  const { sql } = await import("../src/infra/db.ts");

  const captureId = "00000000-0000-0000-0000-0000000e2dca";
  const live = "00000000-0000-0000-0000-0000000e2d01";
  const dead = "00000000-0000-0000-0000-0000000e2d02"; // superseded by `live`

  try {
    await sql`
      INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
      VALUES (${captureId}, 'seed', ${`sha-${captureId}`}, 'test',
              '00000000-0000-0000-0000-0000000e2d99', 'testhost', 'test')
    `;
    const insertCluster = async (id: string, meta: string) => {
      await sql`
        INSERT INTO memories (id, capture_id, chunk_id, content, content_hash,
          embedding_model, kind, importance, machine_id, harness, meta)
        VALUES (${id}, ${captureId}, ${`chunk-${id}`}, 'summary', ${`hash-${id}`},
          'test', 'cluster', 0.8, '00000000-0000-0000-0000-0000000e2d99', 'test', ${meta}::jsonb)
      `;
    };
    await insertCluster(live, '{"member_ids":[]}');
    await insertCluster(dead, `{"member_ids":[],"superseded_by":"${live}"}`);

    expect(await loadCluster(dead)).toBeNull();
    expect(await loadCluster(live)).not.toBeNull();
  } finally {
    const { sql } = await import("../src/infra/db.ts");
    await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
    await sql`DELETE FROM captures WHERE id = ${captureId}`;
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/server/tests/digest.test.ts -t "loadCluster"`
Expected: FAIL — `loadCluster(dead)` returns a row object, not `null` (the superseded filter is missing).

- [ ] **Step 3: Add the superseded filter to `loadCluster`**

In `packages/server/src/worker/digest.ts`, the `loadCluster` query's `WHERE` clause currently reads:

```ts
    WHERE id = ${id} AND kind = 'cluster' AND archived_at IS NULL
```

Replace that line with:

```ts
    WHERE id = ${id} AND kind = 'cluster' AND archived_at IS NULL
      AND (meta->>'superseded_by') IS NULL
```

Update the `loadCluster` doc comment to note the reason: a cluster superseded by an earlier merge in the same digest cycle must not be re-loadable, or it can be picked as a merge winner and strand the loser's members on a dead cluster.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/server/tests/digest.test.ts -t "loadCluster"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/worker/digest.ts packages/server/tests/digest.test.ts
git commit -m "(fix): digest loadCluster skips superseded clusters, no member stranding"
```

---

### Task D2: Migration 0028 — repair stranded `in_cluster`

**Files:**
- Create: `migrations/0028_repair_stranded_in_cluster.sql`

- [ ] **Step 1: Write the migration**

```sql
-- One-time repair: repoint meta.in_cluster off superseded clusters.
--
-- digest's pre-fix cluster-merge loop could, within a single cycle,
-- supersede a cluster and then still load it as a merge winner -- so
-- some members ended up pointing meta.in_cluster at a cluster that is
-- itself superseded. A recall walk from those members lands on a dead
-- cluster instead of the live one.
--
-- This recursive CTE follows each superseded cluster's superseded_by
-- chain to its terminal (non-superseded) cluster, then repoints every
-- member whose in_cluster is a superseded cluster. Idempotent: re-running
-- finds no superseded in_cluster targets and updates nothing.

WITH RECURSIVE chain AS (
  SELECT id AS cluster_id,
         (meta->>'superseded_by')::uuid AS next_id,
         1 AS depth
  FROM memories
  WHERE kind = 'cluster'
    AND (meta->>'superseded_by') IS NOT NULL
  UNION ALL
  SELECT c.cluster_id,
         (m.meta->>'superseded_by')::uuid,
         c.depth + 1
  FROM chain c
  JOIN memories m ON m.id = c.next_id
  WHERE (m.meta->>'superseded_by') IS NOT NULL
),
terminal AS (
  SELECT DISTINCT ON (cluster_id) cluster_id, next_id AS terminal_id
  FROM chain
  ORDER BY cluster_id, depth DESC
)
UPDATE memories tgt
SET meta = jsonb_set(tgt.meta, '{in_cluster}', to_jsonb(t.terminal_id::text))
FROM terminal t
WHERE (tgt.meta->>'in_cluster') = t.cluster_id::text;
```

- [ ] **Step 2: Dry-run**

Run: `bun run migrate:dry`
Expected: `0028_repair_stranded_in_cluster.sql` listed pending, no errors.

- [ ] **Step 3: Apply**

Run: `bun run migrate`
Expected: `0028_repair_stranded_in_cluster.sql` applied, exit 0.

- [ ] **Step 4: Verify no member points at a superseded cluster**

Run:
```bash
set -a && source .pg.env && set +a && psql "$DATABASE_URL" -c "
SELECT count(*) AS stranded
FROM memories m
JOIN memories c ON c.id = (m.meta->>'in_cluster')::uuid
WHERE m.meta->>'in_cluster' IS NOT NULL
  AND c.kind = 'cluster'
  AND c.meta->>'superseded_by' IS NOT NULL;"
```
Expected: `stranded = 0`.

- [ ] **Step 5: Commit**

```bash
git add migrations/0028_repair_stranded_in_cluster.sql
git commit -m "(fix): repair members stranded on superseded clusters"
```

---

## Final verification

- [ ] Run the full suite: `bun run typecheck && bun test`
  Expected: typecheck clean; all tests pass (pre-existing unrelated `bundle.test.ts` failure, if still present, is the only acceptable failure).
- [ ] Confirm migrations 0027 and 0028 are both applied: `bun run migrate:dry` reports nothing pending.

---

## Self-review notes

- **Spec coverage:** Section 1 (dream watermark + neighbor-inclusion) -> Tasks A1-A4. Section 2 (digest Op1 + Op2) -> Tasks B1-B4. Section 3 (nap hardening) -> Tasks C1-C2. Section 4 (stranded bug) -> Tasks D1-D2. Migrations 0027/0028 -> A1/D2.
- **Refinement vs spec:** the spec described Op1 as "stamp every cluster considered as an a or b side." This plan uses an explicit `selectDigestClusterWindow` instead, which is the same intent made concrete: the window *is* the considered set, and stamping the whole window (not just paired clusters) is what actually weaves clusters with no near neighbour. `DIGEST_MERGE_WINDOW` is a new constant, not a change to an existing cap, so it stays within the spec's "out of scope" boundary.
- **No daemon change / no plugin bump:** confirmed in the File map — keeping the wire field name `seeds` means the daemon clusters neighbors with no edit.
- **Type consistency:** `fetchDreamCandidates` returns `{ candidates, seedIds }` (A4) and the route destructures both (A4 Step 2). `findMergePairs(windowIds)` takes the window (B3) produced by `selectDigestClusterWindow` (B2). `stampDigested` (B1) is reused by B3 and B4. `forEachIdBatch` (C1) is consumed by C2.
