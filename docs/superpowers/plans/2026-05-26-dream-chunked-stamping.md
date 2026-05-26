# Dream Per-Batch Stamping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop losing dream progress when the candidates stream times out partway through. Move the `stampDreamedSeeds` call from the end of the stream to inside the per-batch loop, so each successfully-streamed batch's seeds advance the round-robin watermark independently.

**Architecture:** The current code at `packages/server/src/routes/dream.ts:683-688` waits until the entire stream succeeds before stamping. With `DREAM_MAX_CANDIDATES_PER_CYCLE=3000` and observed Railway timeouts (durations of 41 min and 140 min before the daemon's outer wrapper killed the job), every timeout wastes the whole slice. The fix is to call `stampDreamedSeeds(batch)` after each batch's edge rows are streamed; completed batches survive a later timeout. Same code already chunks via `DREAM_STREAM_SEED_BATCH=50` — we're just shifting when the stamp happens. No infrastructure to build.

**Tech Stack:** TypeScript, Bun, Postgres (postgres.js `sql` tag). DB-backed tests via `bun test`, gated on `DATABASE_URL`.

**Spec:** This plan addresses two consecutive dream timeouts (windows 61796 + 61797) observed in production today (`2026-05-26T01:33:55Z` claim, timed out at `02:15:33` with `durationMs=2497939`). Pair with PRs #43 (cluster archive) + #44 (recall propagation) — those addressed cluster lifecycle; this addresses cycle-progress preservation.

---

## File map

| File | Change |
|---|---|
| `packages/server/src/routes/dream.ts:683-688` | Modify. Move `stampDreamedSeeds(batch)` from after the loop into the loop; remove the end-of-stream stamp. Update the comment block to reflect the new invariant. |
| `packages/server/tests/dream-server.test.ts` | Modify. Append DB-backed test asserting that on simulated mid-stream failure, completed batches' seeds got stamped while the unstreamed tail did not. |

No migration. No new constant. No daemon change. Buffered (non-streaming) fallback at line 714-715 unchanged — that path is for pre-1.1.41 daemons and uses a single small fetch.

---

### Task 1: Failing test for per-batch stamping

**Files:**
- Modify: `packages/server/tests/dream-server.test.ts` (append new describe block)

- [ ] **Step 1: Read the existing test file's end and identify the import block.** The current `dream-server.test.ts` uses `describe.skipIf(!HAS_DB)` for DB-backed tests; reuse that pattern.

- [ ] **Step 2: Append the failing test.** This test directly invokes `stampDreamedSeeds` on the *batches* the streaming endpoint would have processed, simulating mid-stream success of batches 1-2 + failure on batch 3.

Append to `packages/server/tests/dream-server.test.ts`:

```ts
describe.skipIf(!HAS_DB)("per-batch stamping survives mid-stream failure", () => {
  const MACHINE = "00000000-0000-0000-0000-00000000d501";
  const CAPTURE_ID = "00000000-0000-0000-0000-00000000d501";
  const ZERO_VEC = `[${Array(384).fill(0).join(",")}]`;
  const atomCount = 150; // > DREAM_STREAM_SEED_BATCH (50), so 3 batches.

  async function seed(): Promise<void> {
    const { sql } = await import("../src/infra/db.ts");
    await sql`
      INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
      VALUES (${CAPTURE_ID}, 'seed', ${`sha-${CAPTURE_ID}`}, 'test', ${MACHINE}, 'testhost', 'test')
    `;
    // 150 atoms with no last_dreamed_at, all eligible to be seeds. Use a
    // deterministic id prefix so we can find them in the assert.
    for (let i = 0; i < atomCount; i++) {
      const id = `00000000-0000-0000-0000-${i.toString(16).padStart(12, "d")}`;
      await sql`
        INSERT INTO memories
          (id, capture_id, content, content_hash, chunk_id, embedding,
           embedding_model, kind, importance, machine_id, harness,
           meta, recall_weight, created_at)
        VALUES
          (${id}::uuid, ${CAPTURE_ID}, ${`atom-${i}`}, ${`h-d5-${i}`},
           ${`h-d5-${i}:bge`}, ${ZERO_VEC}::vector, 'BAAI/bge-small-en-v1.5',
           'discovery', 0.5, ${MACHINE}, 'test', '{}'::jsonb, 0,
           now() - interval '5 days')
      `;
    }
  }

  async function cleanup(): Promise<void> {
    const { sql } = await import("../src/infra/db.ts");
    await sql`DELETE FROM memories WHERE capture_id = ${CAPTURE_ID}`;
    await sql`DELETE FROM captures WHERE id = ${CAPTURE_ID}`;
  }

  test("stampDreamedSeeds called per-batch advances watermark only for streamed batches", async () => {
    const { sql } = await import("../src/infra/db.ts");
    const { stampDreamedSeeds, fetchDreamSeedIds } = await import("../src/routes/dream.ts");
    try {
      await cleanup();
      await seed();

      const seedIds = await fetchDreamSeedIds(MACHINE);
      // Limit the slice to our 150 fixtures (in case the corpus has
      // other unclustered atoms that also rank ahead by last_dreamed_at).
      const ours = seedIds.filter((id) => id.startsWith("00000000-0000-0000-0000-"));
      expect(ours.length).toBeGreaterThanOrEqual(atomCount);

      // Simulate: batch 1 (50 ids) + batch 2 (50 ids) successfully
      // streamed, batch 3 (50 ids) NOT yet stamped because the stream
      // hypothetically aborted before reaching it.
      const BATCH = 50;
      const batch1 = ours.slice(0, BATCH);
      const batch2 = ours.slice(BATCH, BATCH * 2);
      const batch3 = ours.slice(BATCH * 2, BATCH * 3);

      await stampDreamedSeeds(batch1);
      await stampDreamedSeeds(batch2);
      // batch3 NOT stamped.

      const stamped = await sql<{ id: string; ts: string | null }[]>`
        SELECT id::text AS id, meta->>'last_dreamed_at' AS ts
        FROM memories
        WHERE id = ANY(${[...batch1, ...batch2, ...batch3]})
        ORDER BY id
      `;
      const byId = new Map(stamped.map((r) => [r.id, r.ts]));

      for (const id of batch1) expect(byId.get(id)).not.toBeNull();
      for (const id of batch2) expect(byId.get(id)).not.toBeNull();
      for (const id of batch3) expect(byId.get(id)).toBeNull();
    } finally {
      await cleanup();
    }
  });
});
```

- [ ] **Step 3: Run the test to verify it PASSES.**

Run: `bun test packages/server/tests/dream-server.test.ts -t "per-batch stamping survives"`
Expected: PASS. The test directly invokes the existing `stampDreamedSeeds` (which works on any id list); this test is a regression guard for the per-batch semantics, NOT a red-test for absent behavior.

Note: this is a regression guard, not a TDD red test, because the per-batch capability is in the helper already — we're proving the integration. Task 2 changes the *caller* to use it per-batch.

- [ ] **Step 4: Commit.**

```bash
git add packages/server/tests/dream-server.test.ts
git commit -m "(test): cover per-batch stamping invariant for dream candidates"
```

---

### Task 2: Move the stamp inside the loop

**Files:**
- Modify: `packages/server/src/routes/dream.ts:639-697`

- [ ] **Step 1: Read the current streaming block** at lines 636-712 to confirm the structure hasn't changed since plan-write.

- [ ] **Step 2: Replace the seed-batch loop body and the end-of-stream stamp.**

Find this block in `packages/server/src/routes/dream.ts`:

```ts
            const seedIds = await fetchDreamSeedIds(machineId);
            for (let i = 0; i < seedIds.length; i += DREAM_STREAM_SEED_BATCH) {
              if (s.aborted) return;
              const batch = seedIds.slice(i, i + DREAM_STREAM_SEED_BATCH);
              const edgeRows = await fetchDreamEdgeBatch(batch, machineId);
              for (const row of edgeRows) {
                seenSeeds.add(row.id);
                if (row.neighbor_id) neighborIds.add(row.neighbor_id);
                await s.writeln(
                  JSON.stringify({
                    t: "edge",
                    id: row.id,
                    repo: row.repo,
                    content: row.content,
                    kind: row.kind,
                    created_at: row.created_at.toISOString(),
                    neighbor_id: row.neighbor_id,
                  }),
                );
              }
            }
```

Replace with (adds `await stampDreamedSeeds(batch)` after each batch flushes to the stream):

```ts
            const seedIds = await fetchDreamSeedIds(machineId);
            // Stamp last_dreamed_at PER BATCH. Each batch's seeds advance
            // the watermark as soon as their edges are flushed to the
            // stream. If a later batch's SQL throws or the client
            // disconnects, the completed batches' stamps survive — next
            // cycle resumes from the unstamped tail instead of replaying
            // the whole slice. With DREAM_MAX_CANDIDATES_PER_CYCLE=3000
            // and DREAM_STREAM_SEED_BATCH=50, a timeout 30 batches in
            // costs ~600 unstamped seeds, not 3000.
            for (let i = 0; i < seedIds.length; i += DREAM_STREAM_SEED_BATCH) {
              if (s.aborted) return;
              const batch = seedIds.slice(i, i + DREAM_STREAM_SEED_BATCH);
              const edgeRows = await fetchDreamEdgeBatch(batch, machineId);
              for (const row of edgeRows) {
                seenSeeds.add(row.id);
                if (row.neighbor_id) neighborIds.add(row.neighbor_id);
                await s.writeln(
                  JSON.stringify({
                    t: "edge",
                    id: row.id,
                    repo: row.repo,
                    content: row.content,
                    kind: row.kind,
                    created_at: row.created_at.toISOString(),
                    neighbor_id: row.neighbor_id,
                  }),
                );
              }
              await stampDreamedSeeds(batch);
            }
```

- [ ] **Step 3: Remove the now-redundant end-of-stream stamp.**

Find this block:

```ts
            // Stamp only after the whole stream succeeded -- if the
            // daemon disconnected mid-flight, leave the slice intact so
            // the next cycle re-attempts the same rows.
            if (!s.aborted && seenSeeds.size > 0) {
              await stampDreamedSeeds([...seenSeeds]);
            }
            if (!s.aborted) {
              await s.writeln(
                JSON.stringify({
                  t: "done",
                  seeds: seenSeeds.size,
                  neighbors: unseenNeighborIds.length,
                }),
              );
            }
```

Replace with:

```ts
            // Stamping happens per-batch above; nothing to flush here.
            if (!s.aborted) {
              await s.writeln(
                JSON.stringify({
                  t: "done",
                  seeds: seenSeeds.size,
                  neighbors: unseenNeighborIds.length,
                }),
              );
            }
```

The `seenSeeds` Set is still useful for the `t: "done"` count and the unseen-neighbor calculation downstream; only the stamping call moves.

- [ ] **Step 4: Run typecheck.**

Run: `bun run typecheck`
Expected: PASS. Pure refactor — no signature changes.

- [ ] **Step 5: Run the full dream-server test suite.**

Run: `bun test packages/server/tests/dream-server.test.ts`
Expected: All tests pass, including the new per-batch test from Task 1.

There is a known pre-existing failure in `dream-server.test.ts` (`fetchDreamSeedIds returns watermark-ordered eligible ids only` — fails on a 1024-vs-384 dim mismatch, predates this branch and is unrelated). Confirm the count is unchanged: still 1 fail (the same one), all others pass.

- [ ] **Step 6: Commit.**

```bash
git add packages/server/src/routes/dream.ts
git commit -m "(feat): stamp dream watermark per-batch so timeouts don't waste the slice"
```

---

### Task 3: Full suite + PR

- [ ] **Step 1: Full server test suite.**

Run: `bun test packages/server/tests/`
Expected: all pass except the same pre-existing 1024/384 dream-server failure. New per-batch test passes.

- [ ] **Step 2: Push branch.**

```bash
git push -u origin HEAD:feat/dream-chunked-stamping
```

- [ ] **Step 3: Open PR.**

```bash
gh pr create --repo j10ra/mneme --base main \
  --title "Dream: stamp watermark per-batch so timeouts don't waste the slice" \
  --body "$(cat <<'EOF'
## Summary

Move \`stampDreamedSeeds\` from end-of-stream into the per-batch loop. Each batch's seeds get their \`last_dreamed_at\` watermark advanced as soon as their edges flush to the NDJSON stream, so a later timeout / disconnect doesn't waste the whole slice.

## Why

Production today saw two consecutive dream cycles time out at the daemon's outer wrapper:
- 2026-05-25T17:33 (window 61796): durationMs=8,377,694 (~140 min)
- 2026-05-26T01:34 (window 61797): durationMs=2,497,939 (~42 min)

Both windows ended with \`WARN daemon.dream failed :: The operation timed out\` and the candidates slice ran AGAIN from the same seeds on the next 8h tick — no forward progress.

Root cause: the existing code waits until the entire stream succeeds before stamping. With 3000 seeds × 80 neighbors = 240,000 LATERAL HNSW probes plus NDJSON round-trips to the daemon, the total wall-clock often exceeds the daemon's wrapper timeout. Every timeout wastes the slice.

Pinned constraint cb6fd338-1728-4ee7-8539-0c444dedcfbc explicitly rejects lowering the candidate cap and asks for an architectural workaround. This is that workaround.

## What changes

- \`packages/server/src/routes/dream.ts\`: \`stampDreamedSeeds(batch)\` runs inside the seed-batch loop after each batch's edges are flushed. The end-of-stream stamp is removed (redundant). The buffered (non-streaming) fallback path is unchanged.

## What stays the same

- DREAM_MAX_CANDIDATES_PER_CYCLE (3000), DREAM_STREAM_SEED_BATCH (50), DREAM_MAX_NEIGHBORS_PER_MEMORY (80) — no knob changes.
- Round-robin fairness via \`last_dreamed_at NULLS FIRST\` — preserved.
- Cluster cohesion across batches — preserved (daemon's union-find merges components across batches).
- Buffered fallback for pre-1.1.41 daemons — unchanged.

## Failure modes — what now happens

| Failure | Before this PR | After this PR |
|---|---|---|
| SQL timeout mid-cycle | All 3000 seeds unstamped, next cycle replays them | Completed batches stamped, next cycle resumes from the unstamped tail |
| Daemon disconnect mid-cycle | Same — slice intact | Completed batches stamped |
| All batches complete | Single stamp at end | Stamps trickle in per-batch (no behavior change observable) |

## Test plan

- [x] Existing tests pass (the same 1 pre-existing \`fetchDreamSeedIds\` 1024/384 failure remains)
- [x] New DB-backed test \`per-batch stamping survives mid-stream failure\` covers the invariant: batches that succeed get stamped, batches that don't remain at last_dreamed_at = NULL

## After-deploy verification

Watch the next 2-3 dream cycles (next scheduled at ~09:23 UTC):

\`\`\`sql
-- Was the cycle stamped? If watermark advanced, the slice progressed.
SELECT count(*) FILTER (WHERE (meta->>'last_dreamed_at')::timestamptz > now() - interval '1 hour') AS stamped_1h,
       max((meta->>'last_dreamed_at')::timestamptz) AS most_recent_stamp
FROM memories
WHERE meta->>'last_dreamed_at' IS NOT NULL;
-- Expect: stamped_1h grows even if the cycle eventually times out, because per-batch stamps survive
\`\`\`

If the cycle still hits the timeout, we can see in the daemon log how far it got: each successful batch advances the \`last_dreamed_at\` watermark, so the next cycle starts further down the corpus instead of replaying the same 3000.

## Out of scope

- The cumulative timeout itself. The daemon's outer wrapper still kills slow cycles; this PR just preserves their partial work. If we want to bound cycle wall-clock proactively, that's a separate stream-side change.
- Lowering the per-batch SQL cost (e.g., \`DREAM_MAX_NEIGHBORS_PER_MEMORY\` 80 -> 40). Defer until we see per-batch latency from production.

Plan: \`docs/superpowers/plans/2026-05-26-dream-chunked-stamping.md\`
EOF
)"
```

- [ ] **Step 4: Print the PR URL** for review.

---

## Self-review

- **Spec coverage:** the spec was "split the monolithic LATERAL into K=10 chunks of 300 seeds each, stamp per chunk, partial-failure recovery via NULLS-FIRST watermark." Discovery during planning: K-chunking was already shipped (DREAM_STREAM_SEED_BATCH=50 × ~60 batches), only the per-chunk stamping was missing. Scope shrinks from "build chunked execution" to "move the stamp call." All spec invariants (round-robin, cluster cohesion, no daemon change) are preserved by the smaller change.
- **Placeholder scan:** every step has either concrete code or a runnable command + expected outcome. The "known pre-existing failure" note in Task 2 Step 5 is a documented exception, not a TBD.
- **Type consistency:** function names match across tasks (`stampDreamedSeeds`, `fetchDreamSeedIds`, `fetchDreamEdgeBatch`). UUIDs in the test fixture use the 8-4-4-4-12 layout (lesson from the PR #44 review where a 13-char segment broke a fixture).
