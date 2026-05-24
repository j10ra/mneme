# NDD Minimal Patch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plug the cluster-immortality leak in nap, drain the 15k-atom dream backlog faster, and widen digest's merge window. Net effect: stale clusters and their members archive transitively, dream visits every unclustered atom in ~1.7 days instead of ~5, and digest absorbs more near-duplicate summaries.

**Architecture:** Two new SQL phases inside `worker/nap.ts`. `napArchiveDeadClusters` archives `kind='cluster'` rows that are either superseded OR have zero recall + low importance + age ≥ 60 days. `napArchiveOrphanedMembers` archives atoms whose `meta.in_cluster` points at an already-archived cluster (transitive archive — no cascade-detach to avoid dream thrash). Plus three config constant bumps: `DREAM_MAX_CANDIDATES_PER_CYCLE 1000 → 3000`, `DIGEST_MERGE_DISTANCE 0.15 → 0.20`, new `NAP_CLUSTER_ARCHIVE_MIN_AGE_DAYS = 60`. No migrations, no new columns, no plugin version bump (server-only change).

**Tech Stack:** TypeScript, Bun, Postgres (postgres.js `sql` tag), pgvector HNSW. Tests with `bun test`; DB-backed tests gate on `process.env.DATABASE_URL`.

**Spec:** This plan is derived from two critical reviews in the originating conversation. The deeper architectural question of `kind='cluster' → kind='summary'` rename is explicitly out of scope — defer until another reason exists to touch that area.

---

## File map

| File | Change |
|---|---|
| `packages/server/src/infra/config.ts` | Modify. Add `NAP_CLUSTER_ARCHIVE_MIN_AGE_DAYS`, bump `DREAM_MAX_CANDIDATES_PER_CYCLE`, bump `DIGEST_MERGE_DISTANCE`. |
| `packages/server/src/worker/nap.ts` | Modify. Add `napArchiveDeadClusters` + `napArchiveOrphanedMembers`. Extend `NapResult`. Wire into `runNapOnce`. |
| `packages/server/tests/nap.test.ts` | Modify. Append DB-backed tests for both new functions. |

No daemon change, no migration, no plugin version bump (server-only deploy via Railway).

---

### Task 1: Bump config constants

**Files:**
- Modify: `packages/server/src/infra/config.ts:84,126,232`

- [ ] **Step 1: Open `packages/server/src/infra/config.ts` and locate the three constants.**

Current state at the relevant lines:

```ts
// Line 84
export const NAP_ARCHIVE_IMPORTANCE_MAX = 0.1;
// Line 88
export const NAP_ARCHIVE_MIN_AGE_DAYS = 30;
// Line 93
export const NAP_ARCHIVE_PER_CYCLE_CAP = 200;
// ...
// Line 126
export const DREAM_MAX_CANDIDATES_PER_CYCLE = 1000;
// ...
// Line 232
export const DIGEST_MERGE_DISTANCE = 0.15;
```

- [ ] **Step 2: Add `NAP_CLUSTER_ARCHIVE_MIN_AGE_DAYS` constant directly below `NAP_ARCHIVE_MIN_AGE_DAYS`.**

Insert after line 88 (after `export const NAP_ARCHIVE_MIN_AGE_DAYS = 30;`):

```ts
/** Cluster summaries get longer grace before nap reaps them. A cluster
 *  represents condensed signal from N atoms and one Sonnet call; we
 *  want recall and importance to stay dead for longer before we
 *  conclude the whole synthesis is irrelevant. */
export const NAP_CLUSTER_ARCHIVE_MIN_AGE_DAYS = 60;
```

- [ ] **Step 3: Bump `DREAM_MAX_CANDIDATES_PER_CYCLE` 1000 → 3000.**

Edit line 126:

```ts
export const DREAM_MAX_CANDIDATES_PER_CYCLE = 3000;
```

The neighboring docstring already explains the round-robin rationale; no comment changes needed. Watch for Railway gateway timeouts during the first few dream cycles after deploy (the LATERAL HNSW work scales linearly with this cap × `DREAM_MAX_NEIGHBORS_PER_MEMORY=80`).

- [ ] **Step 4: Bump `DIGEST_MERGE_DISTANCE` 0.15 → 0.20.**

Edit line 232:

```ts
export const DIGEST_MERGE_DISTANCE = 0.20;
```

Then update the leading docstring comment to reflect the new value. Find the block above this constant and change any literal `0.15` references inside the comment to `0.20`.

- [ ] **Step 5: Run typecheck to verify no consumers broke.**

Run: `bun run typecheck`
Expected: PASS, no errors. (These are number constants, no signature changes.)

- [ ] **Step 6: Commit.**

```bash
git add packages/server/src/infra/config.ts
git commit -m "(refactor): widen dream sweep + digest merge, add cluster archive age knob"
```

---

### Task 2: Extend `NapResult` type and add `napArchiveDeadClusters`

**Files:**
- Modify: `packages/server/src/worker/nap.ts:48-56,115-134,257-275`
- Modify: `packages/server/tests/nap.test.ts` (append)

- [ ] **Step 1: Extend `NapResult` type to carry the two new counts.**

In `packages/server/src/worker/nap.ts`, find the type at lines 48-56:

```ts
export type NapResult = {
  decayed: number;
  ltp_decayed: number;
  archived: number;
  related: number;
  superseded: number;
};
```

Replace with:

```ts
export type NapResult = {
  decayed: number;
  ltp_decayed: number;
  archived: number;
  cluster_archived: number;
  member_archived: number;
  related: number;
  superseded: number;
};
```

- [ ] **Step 2: Add `NAP_CLUSTER_ARCHIVE_MIN_AGE_DAYS` to the imports in nap.ts.**

Find the existing import block at the top of `packages/server/src/worker/nap.ts` that pulls from `../infra/config.ts`. Add `NAP_CLUSTER_ARCHIVE_MIN_AGE_DAYS` to the destructured list. Example before/after if the existing block looks like:

```ts
import {
  NAP_ARCHIVE_IMPORTANCE_MAX,
  NAP_ARCHIVE_MIN_AGE_DAYS,
  NAP_ARCHIVE_PER_CYCLE_CAP,
  NAP_DECAY_PER_CYCLE,
  // ...
} from "../infra/config.ts";
```

becomes:

```ts
import {
  NAP_ARCHIVE_IMPORTANCE_MAX,
  NAP_ARCHIVE_MIN_AGE_DAYS,
  NAP_ARCHIVE_PER_CYCLE_CAP,
  NAP_CLUSTER_ARCHIVE_MIN_AGE_DAYS,
  NAP_DECAY_PER_CYCLE,
  // ...
} from "../infra/config.ts";
```

- [ ] **Step 3: Write failing test for `napArchiveDeadClusters`.**

Append to `packages/server/tests/nap.test.ts`:

```ts
import { sql } from "../src/infra/db.ts";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("napArchiveDeadClusters (requires DATABASE_URL)", () => {
  const ZERO_VEC = `[${Array(384).fill(0).join(",")}]`;
  const MACHINE = "00000000-0000-0000-0000-00000000c001";
  const ids = {
    superseded: "00000000-0000-0000-0000-000000c10001",
    dead: "00000000-0000-0000-0000-000000c10002",
    live: "00000000-0000-0000-0000-000000c10003",
    young_dead: "00000000-0000-0000-0000-000000c10004",
  };

  async function seed(): Promise<void> {
    // Cluster A: superseded (eligible regardless of age/recall/importance)
    await sql`
      INSERT INTO memories
        (id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, meta, recall_weight, created_at)
      VALUES
        (${ids.superseded}::uuid, 'A', 'h-c1', 'h-c1:bge', ${ZERO_VEC}::vector,
         'BAAI/bge-small-en-v1.5', 'cluster', 0.8, ${MACHINE},
         '{"superseded_by":"00000000-0000-0000-0000-000000c1ffff"}'::jsonb,
         0, now() - interval '5 days')
    `;
    // Cluster B: dead by criteria (rw=0, imp at floor, age > 60d)
    await sql`
      INSERT INTO memories
        (id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, meta, recall_weight, created_at)
      VALUES
        (${ids.dead}::uuid, 'B', 'h-c2', 'h-c2:bge', ${ZERO_VEC}::vector,
         'BAAI/bge-small-en-v1.5', 'cluster', 0.05, ${MACHINE},
         '{}'::jsonb, 0, now() - interval '90 days')
    `;
    // Cluster C: live (importance above threshold)
    await sql`
      INSERT INTO memories
        (id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, meta, recall_weight, created_at)
      VALUES
        (${ids.live}::uuid, 'C', 'h-c3', 'h-c3:bge', ${ZERO_VEC}::vector,
         'BAAI/bge-small-en-v1.5', 'cluster', 0.8, ${MACHINE},
         '{}'::jsonb, 0, now() - interval '90 days')
    `;
    // Cluster D: dead by signals but too young (≤ 60d)
    await sql`
      INSERT INTO memories
        (id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, meta, recall_weight, created_at)
      VALUES
        (${ids.young_dead}::uuid, 'D', 'h-c4', 'h-c4:bge', ${ZERO_VEC}::vector,
         'BAAI/bge-small-en-v1.5', 'cluster', 0.05, ${MACHINE},
         '{}'::jsonb, 0, now() - interval '30 days')
    `;
  }

  async function cleanup(): Promise<void> {
    await sql`DELETE FROM memories WHERE id::text = ANY(${Object.values(ids)}::text[])`;
  }

  test("archives superseded clusters and dead-by-signal clusters past min age; leaves live and young alone", async () => {
    try {
      await cleanup();
      await seed();
      const { napArchiveDeadClusters } = await import("../src/worker/nap.ts");
      const count = await napArchiveDeadClusters();
      expect(count).toBeGreaterThanOrEqual(2);

      const rows = await sql<{ id: string; archived: boolean }[]>`
        SELECT id::text, archived_at IS NOT NULL AS archived
        FROM memories
        WHERE id::text = ANY(${Object.values(ids)}::text[])
        ORDER BY id
      `;
      const byId = new Map(rows.map((r) => [r.id, r.archived]));
      expect(byId.get(ids.superseded)).toBe(true);
      expect(byId.get(ids.dead)).toBe(true);
      expect(byId.get(ids.live)).toBe(false);
      expect(byId.get(ids.young_dead)).toBe(false);
    } finally {
      await cleanup();
    }
  });
});
```

- [ ] **Step 4: Run the test to verify it fails (function not exported yet).**

Run: `bun test packages/server/tests/nap.test.ts`
Expected: FAIL on import — `napArchiveDeadClusters` is not exported from `../src/worker/nap.ts`.

- [ ] **Step 5: Implement `napArchiveDeadClusters` in nap.ts.**

In `packages/server/src/worker/nap.ts`, add this function directly after `napArchiveOrphans` (after line 134):

```ts
/** Phase 2b: archive cluster summaries that are either superseded or
 *  have decayed to irrelevance. Mirrors napArchiveOrphans criteria but
 *  with the cluster-age knob, plus the superseded clause as an early
 *  exit (a superseded cluster is dead by definition once digest has
 *  re-pointed its members). Atoms that point at one of these clusters
 *  via meta.in_cluster get cleaned up in the next phase
 *  (napArchiveOrphanedMembers) by transitive archive, so we do not
 *  detach members here. */
async function napArchiveDeadClusters(): Promise<number> {
  const archived = await sql`
    WITH targets AS (
      SELECT id FROM memories
      WHERE archived_at IS NULL
        AND kind = 'cluster'
        AND (
          (meta->>'superseded_by') IS NOT NULL
          OR (
            importance <= ${NAP_ARCHIVE_IMPORTANCE_MAX}::real
            AND COALESCE(recall_weight, 0) = 0
            AND created_at < now() - (${NAP_CLUSTER_ARCHIVE_MIN_AGE_DAYS}::int || ' days')::interval
          )
        )
        AND NOT COALESCE((meta->>'pinned')::boolean, false)
      ORDER BY created_at ASC
      LIMIT ${NAP_ARCHIVE_PER_CYCLE_CAP}
    )
    UPDATE memories
    SET archived_at = now()
    WHERE id IN (SELECT id FROM targets)
  `;
  return archived.count;
}

export { napArchiveDeadClusters };
```

The `export` at the bottom lets the test import it directly. (Mirroring the existing `forEachIdBatch` export pattern.)

- [ ] **Step 6: Run the test to verify it passes.**

Run: `bun test packages/server/tests/nap.test.ts`
Expected: PASS. The four-fixture test confirms superseded + dead-by-signal get archived; live + young-dead are left alone.

- [ ] **Step 7: Run typecheck.**

Run: `bun run typecheck`
Expected: PASS. (NapResult now has two new required fields but no caller mints one yet — that wires in Task 4. If typecheck fails on a downstream consumer of NapResult, note it and continue; the orchestrator wiring in Task 4 will satisfy it.)

- [ ] **Step 8: Commit.**

```bash
git add packages/server/src/worker/nap.ts packages/server/tests/nap.test.ts
git commit -m "(feat): nap archives dead/superseded cluster summaries"
```

---

### Task 3: Add `napArchiveOrphanedMembers`

**Files:**
- Modify: `packages/server/src/worker/nap.ts` (append function)
- Modify: `packages/server/tests/nap.test.ts` (append test)

- [ ] **Step 1: Write the failing test.**

Append to `packages/server/tests/nap.test.ts`:

```ts
describe.skipIf(!HAS_DB)("napArchiveOrphanedMembers (requires DATABASE_URL)", () => {
  const ZERO_VEC = `[${Array(384).fill(0).join(",")}]`;
  const MACHINE = "00000000-0000-0000-0000-00000000c002";
  const ids = {
    dead_cluster: "00000000-0000-0000-0000-000000c20001",
    live_cluster: "00000000-0000-0000-0000-000000c20002",
    orphan_atom: "00000000-0000-0000-0000-000000a20001",
    live_atom: "00000000-0000-0000-0000-000000a20002",
    unclustered_atom: "00000000-0000-0000-0000-000000a20003",
  };

  async function seed(): Promise<void> {
    // Already-archived cluster
    await sql`
      INSERT INTO memories
        (id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, meta, recall_weight, created_at, archived_at)
      VALUES
        (${ids.dead_cluster}::uuid, 'dead-cluster', 'h-dc', 'h-dc:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'cluster', 0.05, ${MACHINE},
         '{}'::jsonb, 0, now() - interval '90 days', now() - interval '1 hour')
    `;
    // Live cluster
    await sql`
      INSERT INTO memories
        (id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, meta, recall_weight, created_at)
      VALUES
        (${ids.live_cluster}::uuid, 'live-cluster', 'h-lc', 'h-lc:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'cluster', 0.8, ${MACHINE},
         '{}'::jsonb, 0, now() - interval '5 days')
    `;
    // Orphan atom: member of the archived cluster
    await sql`
      INSERT INTO memories
        (id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, meta, recall_weight, created_at)
      VALUES
        (${ids.orphan_atom}::uuid, 'orphan', 'h-oa', 'h-oa:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE},
         ${sql.json({ in_cluster: ids.dead_cluster })}, 0, now() - interval '5 days')
    `;
    // Live atom: member of the live cluster
    await sql`
      INSERT INTO memories
        (id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, meta, recall_weight, created_at)
      VALUES
        (${ids.live_atom}::uuid, 'live-atom', 'h-la', 'h-la:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE},
         ${sql.json({ in_cluster: ids.live_cluster })}, 0, now() - interval '5 days')
    `;
    // Unclustered atom: no in_cluster, should never be touched by this phase
    await sql`
      INSERT INTO memories
        (id, content, content_hash, chunk_id, embedding, embedding_model,
         kind, importance, machine_id, meta, recall_weight, created_at)
      VALUES
        (${ids.unclustered_atom}::uuid, 'unclustered', 'h-uc', 'h-uc:bge',
         ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5', 'discovery', 0.5, ${MACHINE},
         '{}'::jsonb, 0, now() - interval '5 days')
    `;
  }

  async function cleanup(): Promise<void> {
    await sql`DELETE FROM memories WHERE id::text = ANY(${Object.values(ids)}::text[])`;
  }

  test("archives atoms whose in_cluster points at an archived cluster; leaves live members + unclustered alone", async () => {
    try {
      await cleanup();
      await seed();
      const { napArchiveOrphanedMembers } = await import("../src/worker/nap.ts");
      const count = await napArchiveOrphanedMembers();
      expect(count).toBeGreaterThanOrEqual(1);

      const rows = await sql<{ id: string; archived: boolean }[]>`
        SELECT id::text, archived_at IS NOT NULL AS archived
        FROM memories
        WHERE id::text = ANY(${Object.values(ids)}::text[])
        ORDER BY id
      `;
      const byId = new Map(rows.map((r) => [r.id, r.archived]));
      expect(byId.get(ids.orphan_atom)).toBe(true);
      expect(byId.get(ids.live_atom)).toBe(false);
      expect(byId.get(ids.unclustered_atom)).toBe(false);
    } finally {
      await cleanup();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `bun test packages/server/tests/nap.test.ts`
Expected: FAIL on import — `napArchiveOrphanedMembers` is not exported.

- [ ] **Step 3: Implement `napArchiveOrphanedMembers` in nap.ts.**

Append in `packages/server/src/worker/nap.ts`, directly after `napArchiveDeadClusters`:

```ts
/** Phase 2c: transitive archive. After Phase 2b archives dead clusters,
 *  any atom whose meta.in_cluster still points at an archived cluster
 *  is by-membership dead. Archive these in the same nap pass instead of
 *  detaching them, which would just feed them back to dream and form a
 *  near-identical cluster next window. Capped at the same per-cycle cap
 *  so a one-time bloom of cluster archives doesn't dump thousands of
 *  members at once. */
async function napArchiveOrphanedMembers(): Promise<number> {
  const archived = await sql`
    WITH targets AS (
      SELECT m.id FROM memories m
      JOIN memories c ON c.id::text = m.meta->>'in_cluster'
      WHERE m.archived_at IS NULL
        AND m.kind <> 'cluster'
        AND c.archived_at IS NOT NULL
        AND c.kind = 'cluster'
        AND NOT COALESCE((m.meta->>'pinned')::boolean, false)
      ORDER BY m.created_at ASC
      LIMIT ${NAP_ARCHIVE_PER_CYCLE_CAP}
    )
    UPDATE memories
    SET archived_at = now()
    WHERE id IN (SELECT id FROM targets)
  `;
  return archived.count;
}

export { napArchiveOrphanedMembers };
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `bun test packages/server/tests/nap.test.ts`
Expected: PASS. The orphan_atom archives because its in_cluster points at dead_cluster (already archived). The live_atom and unclustered_atom stay alive.

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/worker/nap.ts packages/server/tests/nap.test.ts
git commit -m "(feat): nap transitively archives orphaned cluster members"
```

---

### Task 4: Wire both phases into `runNapOnce`

**Files:**
- Modify: `packages/server/src/worker/nap.ts:257-275`

- [ ] **Step 1: Update `runNapOnce` to call both new phases.**

In `packages/server/src/worker/nap.ts`, find the orchestrator at lines 257-275 (the body of `runNapOnce`). Current body:

```ts
export const runNapOnce = mnemeFn("worker.nap.once", async (): Promise<NapResult> => {
  const decayed = await napDecayImportance();
  const ltpDecayed = await napDecayRecallWeight();
  const archived = await napArchiveOrphans();
  const seed = await napSeedPhase();

  const result: NapResult = {
    decayed,
    ltp_decayed: ltpDecayed,
    archived,
    related: seed.related,
    superseded: seed.superseded,
  };
  Logger.info("nap: done", result);
  return result;
});
```

Replace with:

```ts
export const runNapOnce = mnemeFn("worker.nap.once", async (): Promise<NapResult> => {
  const decayed = await napDecayImportance();
  const ltpDecayed = await napDecayRecallWeight();
  const archived = await napArchiveOrphans();
  // Cluster archive runs BEFORE member archive so the transitive
  // pass sees freshly-archived clusters from this same nap cycle.
  const clusterArchived = await napArchiveDeadClusters();
  const memberArchived = await napArchiveOrphanedMembers();
  const seed = await napSeedPhase();

  const result: NapResult = {
    decayed,
    ltp_decayed: ltpDecayed,
    archived,
    cluster_archived: clusterArchived,
    member_archived: memberArchived,
    related: seed.related,
    superseded: seed.superseded,
  };
  Logger.info("nap: done", result);
  return result;
});
```

The order matters: `napArchiveDeadClusters` must run before `napArchiveOrphanedMembers` so that within a single nap cycle, atoms whose cluster died this cycle get caught by the transitive pass immediately instead of waiting for the next cycle.

- [ ] **Step 2: Run typecheck.**

Run: `bun run typecheck`
Expected: PASS. The NapResult shape now matches every consumer.

- [ ] **Step 3: Run the full test suite.**

Run: `bun test packages/server/tests/`
Expected: PASS across all test files. The new nap.test.ts cases pass; existing tests are unaffected.

- [ ] **Step 4: Commit.**

```bash
git add packages/server/src/worker/nap.ts
git commit -m "(feat): wire new cluster + member archive phases into runNapOnce"
```

---

### Task 5: End-to-end verification against production data

**Files:** none — verification only.

- [ ] **Step 1: Confirm production currently has 11 unarchived superseded clusters.**

Run via the `mneme_sql` MCP tool:

```sql
SELECT count(*) AS superseded_unarchived
FROM memories
WHERE kind = 'cluster'
  AND archived_at IS NULL
  AND (meta->>'superseded_by') IS NOT NULL
```

Expected: ≥1 (the live observation was 11 at plan time; small day-over-day drift is fine).

- [ ] **Step 2: Confirm production has dead-by-signal cluster candidates.**

```sql
SELECT count(*) AS dead_eligible
FROM memories
WHERE kind = 'cluster'
  AND archived_at IS NULL
  AND importance <= 0.1
  AND COALESCE(recall_weight, 0) = 0
  AND created_at < now() - interval '60 days'
```

Expected: small integer (could be 0; the superseded ones above are the load-bearing target).

- [ ] **Step 3: Note expectations for post-deploy verification (do not run yet).**

After the change deploys via Railway and one nap cycle runs (~4h), expect:
- `superseded_unarchived` query in Step 1 returns 0.
- Any atoms whose `meta.in_cluster` pointed at one of the archived clusters are also `archived_at IS NOT NULL`. Verify with:

```sql
SELECT m.id, m.meta->>'in_cluster' AS cluster_id
FROM memories m
JOIN memories c ON c.id::text = m.meta->>'in_cluster'
WHERE m.archived_at IS NULL
  AND m.kind <> 'cluster'
  AND c.archived_at IS NOT NULL
```

Expected post-deploy: 0 rows (membership-archive caught them all).

These verification queries live in this plan for the operator to run after PR merge + Railway deploy; they are not part of the test suite.

---

### Task 6: Open the PR

**Files:** none — git operations only.

- [ ] **Step 1: Confirm branch and committed state.**

Run: `git status --short`
Expected: clean working tree (all four commits from Tasks 1-4 already in).

Run: `git log --oneline -6`
Expected: the four new commits at the head of the branch.

- [ ] **Step 2: Push the branch to origin.**

If working on `main`, create a feature branch first:

```bash
git checkout -b feat/ndd-minimal-patch
git push -u origin feat/ndd-minimal-patch
```

If already on a feature branch from a worktree, just push:

```bash
git push -u origin HEAD
```

- [ ] **Step 3: Open the PR with `gh`.**

```bash
gh pr create --title "NDD minimal patch: cluster archive + dream sweep + digest merge" --body "$(cat <<'EOF'
## Summary

- Plug cluster-immortality leak: nap now archives `kind='cluster'` rows that are either superseded or have decayed (zero recall + low importance + age ≥ 60d).
- Transitive member archive: atoms whose `meta.in_cluster` points at an archived cluster get archived in the same nap cycle (no cascade-detach, no dream thrash).
- Dream sweep widened: `DREAM_MAX_CANDIDATES_PER_CYCLE` 1000 → 3000 so the round-robin covers the full unclustered-atom set in ~1.7 days instead of ~5.
- Digest merge loosened: `DIGEST_MERGE_DISTANCE` 0.15 → 0.20 — same noise reduction the scrapped theme-tier would have given, with zero new code.

Server-only change. No migration, no plugin version bump.

## Test plan

- [ ] `bun run typecheck` clean
- [ ] `bun test packages/server/tests/nap.test.ts` passes (two new DB-backed describe blocks)
- [ ] `bun test packages/server/tests/` full suite passes (no regressions)
- [ ] After Railway deploy + one nap cycle (~4h): confirm `superseded_unarchived` query returns 0
- [ ] Watch Railway gateway timeout dashboard for first 2-3 dream cycles (3x candidate cap → 3x LATERAL HNSW work upstream)
EOF
)"
```

- [ ] **Step 4: Print the PR URL for review.**

The `gh pr create` command returns the URL on success. Surface it to the user so they can open it directly.

---

## Self-review checklist

- **Spec coverage:** The four agreed deltas (cluster archive, transitive member archive, dream cap bump, digest merge widen) each have a task. The two reviewer-deferred items (recall propagation atom→cluster, theme tier, kind=cluster→summary rename) are explicitly excluded from this plan per the originating conversation.
- **Placeholder scan:** No "TBD", "add handling", or "similar to Task N". Each step has either concrete code or a concrete command with expected output.
- **Type consistency:** `NapResult` field names (`cluster_archived`, `member_archived`) match between the type definition in Task 2, the orchestrator wiring in Task 4. Function names (`napArchiveDeadClusters`, `napArchiveOrphanedMembers`) match between definition, export, test import, and orchestrator call sites.
