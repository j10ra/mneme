# Atom→Cluster Recall Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When `mneme_sql` reinforces a recall hit on an atom, also bump the cluster that atom belongs to (via `meta.in_cluster`). Makes cluster recall_weight reflect member traffic, so nap's cluster-archive Phase 2b doesn't reap clusters that are functionally alive through their atoms.

**Architecture:** One SQL statement change in `services/mcp.ts:reinforce` — wrap the existing `UPDATE memories SET recall_weight = ...` in a CTE that captures each bumped row's `meta->>'in_cluster'` value, then a second `UPDATE` against `kind='cluster'` rows whose id appears in that set. IN-clause dedupes so multi-atom hits inside the same cluster bump it once per query, not once per atom.

**Tech Stack:** TypeScript, Bun, Postgres (postgres.js `sql` tag). Tests with `bun test`; DB-backed test gates on `process.env.DATABASE_URL`.

---

## File map

| File | Change |
|---|---|
| `packages/server/src/services/mcp.ts:193-200` | Modify. Wrap `reinforce` SQL in CTE + second UPDATE for cluster propagation. Export the function for testing. |
| `packages/server/tests/mcp.test.ts` | Modify. Append DB-backed describe block for `reinforce` propagation. |

No migration. No new column. No config knob.

---

### Task 1: Export `reinforce` + write failing test

**Files:**
- Modify: `packages/server/src/services/mcp.ts:193` — change `async function reinforce` to `export async function reinforce`
- Modify: `packages/server/tests/mcp.test.ts` — append DB-backed test

- [ ] **Step 1: Export `reinforce`.** Change `async function reinforce(r: Reinforcement)` to `export async function reinforce(r: Reinforcement)` at `mcp.ts:193`.

- [ ] **Step 2: Append failing DB-backed test in mcp.test.ts.**

The test seeds: 1 cluster, 2 atoms (atomA in the cluster, atomB not). Calls `reinforce` with both atom ids. Verifies that BOTH atoms AND the cluster got their recall_weight bumped — atomA + atomB by `strength`, cluster by `strength` ONCE (even though only one atom in it was hit).

```ts
import { sql } from "../src/infra/db.ts";

const HAS_DB = Boolean(process.env.DATABASE_URL);
const ZERO_VEC = `[${Array(384).fill(0).join(",")}]`;

describe.skipIf(!HAS_DB)("reinforce propagates atom bumps up to cluster (requires DATABASE_URL)", () => {
  const MACHINE = "00000000-0000-0000-0000-0000000ead01";
  const CAPTURE_ID = "00000000-0000-0000-0000-0000000ead01";
  const ids = {
    cluster: "00000000-0000-0000-0000-0000000c1ad01",
    atomA: "00000000-0000-0000-0000-0000000a1ad01",
    atomB: "00000000-0000-0000-0000-0000000a1ad02",
    archivedCluster: "00000000-0000-0000-0000-0000000c1ad02",
    atomC: "00000000-0000-0000-0000-0000000a1ad03",
  };

  async function seed(): Promise<void> {
    await sql`
      INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
      VALUES (${CAPTURE_ID}, 'seed', ${`sha-${CAPTURE_ID}`}, 'test', ${MACHINE}, 'testhost', 'test')
    `;
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.cluster}::uuid, ${CAPTURE_ID}, 'cluster', 'h-cl', 'h-cl:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'cluster', 0.8, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '5 days')
    `;
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at, archived_at)
      VALUES
        (${ids.archivedCluster}::uuid, ${CAPTURE_ID}, 'archived-cluster', 'h-ac', 'h-ac:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'cluster', 0.05, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '90 days', now() - interval '1 hour')
    `;
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.atomA}::uuid, ${CAPTURE_ID}, 'atomA', 'h-aa', 'h-aa:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         ${sql.json({ in_cluster: ids.cluster })}, 0, now() - interval '5 days')
    `;
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.atomB}::uuid, ${CAPTURE_ID}, 'atomB', 'h-ab', 'h-ab:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         '{}'::jsonb, 0, now() - interval '5 days')
    `;
    await sql`
      INSERT INTO memories
        (id, capture_id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, harness, meta, recall_weight, created_at)
      VALUES
        (${ids.atomC}::uuid, ${CAPTURE_ID}, 'atomC', 'h-ac2', 'h-ac2:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE}, 'test',
         ${sql.json({ in_cluster: ids.archivedCluster })}, 0, now() - interval '5 days')
    `;
  }

  async function cleanup(): Promise<void> {
    await sql`DELETE FROM memories WHERE capture_id = ${CAPTURE_ID}`;
    await sql`DELETE FROM captures WHERE id = ${CAPTURE_ID}`;
  }

  test("bumping atoms propagates to their cluster; unclustered atom and archived-cluster member are isolated", async () => {
    try {
      await cleanup();
      await seed();
      const { reinforce } = await import("../src/services/mcp.ts");
      await reinforce({ strength: 1, ids: [ids.atomA, ids.atomB, ids.atomC] });

      const rows = await sql<{ id: string; rw: number }[]>`
        SELECT id::text AS id, recall_weight AS rw
        FROM memories
        WHERE id::text = ANY(${Object.values(ids)}::text[])
        ORDER BY id
      `;
      const byId = new Map(rows.map((r) => [r.id, r.rw]));
      expect(byId.get(ids.atomA)).toBeCloseTo(1, 5);
      expect(byId.get(ids.atomB)).toBeCloseTo(1, 5);
      expect(byId.get(ids.atomC)).toBeCloseTo(1, 5);
      // The cluster got bumped ONCE because atomA's in_cluster points at it.
      expect(byId.get(ids.cluster)).toBeCloseTo(1, 5);
      // The archived cluster stays at 0: archived rows are filtered.
      expect(byId.get(ids.archivedCluster)).toBeCloseTo(0, 5);
    } finally {
      await cleanup();
    }
  });

  test("multiple atoms in the same cluster bump the cluster once per query, not once per atom", async () => {
    try {
      await cleanup();
      await seed();
      // Move atomB into the same cluster as atomA.
      await sql`
        UPDATE memories
        SET meta = meta || ${sql.json({ in_cluster: ids.cluster })}
        WHERE id = ${ids.atomB}::uuid
      `;
      const { reinforce } = await import("../src/services/mcp.ts");
      await reinforce({ strength: 1, ids: [ids.atomA, ids.atomB] });

      const [clusterRow] = await sql<{ rw: number }[]>`
        SELECT recall_weight AS rw FROM memories WHERE id = ${ids.cluster}::uuid
      `;
      // Cluster bumped ONCE (not 2x), because IN-clause dedupes.
      expect(clusterRow?.rw).toBeCloseTo(1, 5);
    } finally {
      await cleanup();
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails** (since `reinforce` doesn't yet propagate).

Run: `bun test packages/server/tests/mcp.test.ts -t "propagates atom bumps"`
Expected: `cluster` recall_weight is 0, not 1 — old code didn't propagate.

- [ ] **Step 4: Commit the failing test.**

```bash
git add packages/server/src/services/mcp.ts packages/server/tests/mcp.test.ts
git commit -m "(test): cover atom->cluster recall propagation (red)"
```

---

### Task 2: Implement the propagation in `reinforce`

**Files:**
- Modify: `packages/server/src/services/mcp.ts:193-200`

- [ ] **Step 1: Replace `reinforce` body with the CTE + propagation UPDATE.**

Find the current implementation:

```ts
export async function reinforce(r: Reinforcement): Promise<void> {
  await sql`
    UPDATE memories
    SET recall_weight = recall_weight + ${r.strength}::real
    WHERE id = ANY(${r.ids})
      AND archived_at IS NULL
  `;
}
```

Replace with:

```ts
export async function reinforce(r: Reinforcement): Promise<void> {
  // Two-step bump: first the rows that were hit, then any cluster they
  // belong to (via meta.in_cluster). The IN-clause dedupes so a query
  // that hits 5 atoms inside the same cluster bumps that cluster ONCE
  // per query, not 5 times — "one query = one signal" for the cluster,
  // regardless of how many of its members it surfaced.
  await sql.begin(async (tx) => {
    const bumped = await tx<{ cluster_id: string | null }[]>`
      UPDATE memories
      SET recall_weight = recall_weight + ${r.strength}::real
      WHERE id = ANY(${r.ids})
        AND archived_at IS NULL
      RETURNING meta->>'in_cluster' AS cluster_id
    `;
    const clusterIds = [
      ...new Set(bumped.map((b) => b.cluster_id).filter((v): v is string => v !== null)),
    ];
    if (clusterIds.length === 0) return;
    await tx`
      UPDATE memories
      SET recall_weight = recall_weight + ${r.strength}::real
      WHERE id::text = ANY(${clusterIds})
        AND kind = 'cluster'
        AND archived_at IS NULL
    `;
  });
}
```

- [ ] **Step 2: Run the test to verify it passes.**

Run: `bun test packages/server/tests/mcp.test.ts -t "propagates atom bumps"`
Expected: `cluster` recall_weight equals `strength` ✓, archived cluster stays at 0 ✓, dedup test (cluster gets +1 not +2) ✓.

- [ ] **Step 3: Run typecheck.**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add packages/server/src/services/mcp.ts
git commit -m "(feat): propagate atom recall hits up to their cluster"
```

---

### Task 3: Full suite + PR

- [ ] **Step 1: Run full server test suite.**

Run: `bun test packages/server/tests/`
Expected: all pass except the pre-existing `dream-server.test.ts` 1024-vs-384 failure (unrelated, predates this branch).

- [ ] **Step 2: Push to a feature branch.**

```bash
git push -u origin HEAD:feat/recall-propagation
```

- [ ] **Step 3: Open PR with monitoring queries in body.**

```bash
gh pr create --base main --title "Recall propagation: atom hits bump in_cluster too" --body "
## Summary
- services/mcp.ts: reinforce() now propagates each atom-recall hit up to its cluster row via meta.in_cluster
- IN-clause dedup: 5 atoms in same cluster -> cluster bumped once per query, not five times
- Filters: archived clusters excluded; kind='cluster' guard against bad meta pointers

## Why
Today cluster recall_weight only grows on direct cluster hits, but agents mostly hit atoms via the Layer-1 hybrid ranker. Result: clusters look 'dead' even when their atoms are popular, and nap's new Phase 2b would archive them after their grace period.

This change reflects member traffic upward, so clusters that are functionally alive through their atoms stay alive in nap's eyes.

## After-deploy verification

\`\`\`sql
-- (1) Pick a cluster and a member atom that just got a Layer-1 hit
SELECT id, kind, recall_weight FROM memories
WHERE id IN ('<atom-id>', (SELECT id FROM memories WHERE id::text = (
  SELECT meta->>'in_cluster' FROM memories WHERE id = '<atom-id>'
)));
-- Expect: both rows increased after the hit
\`\`\`
"
```

---

## Self-review

- **Spec coverage:** the recall-propagation lever from the deferred Track B is the only goal; both tests cover the happy path + the dedup invariant + the archived-cluster filter.
- **Placeholder scan:** no TBDs, every step has either a code block or a runnable command + expected output.
- **Type consistency:** `Reinforcement` shape unchanged. `reinforce` keeps the same signature, gains export.
