// /api/auth/register fingerprint upsert tests.
//
// Validates the re-install UX: same physical machine sending the same
// fingerprint twice maps to the same machine_id with the token rotated,
// not a new row alongside the old one.

import { afterAll, describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("registerOrRotate (requires DATABASE_URL)", () => {
  const fingerprintsToCleanup: string[] = [];

  afterAll(async () => {
    if (fingerprintsToCleanup.length === 0) return;
    const { sql } = await import("../src/infra/db.ts");
    await sql`
        DELETE FROM _ops.api_keys
        WHERE machine_fingerprint = ANY(${fingerprintsToCleanup})
      `;
  });

  test("fingerprint match: reuses machine_id, rotates token, revokes old keys", async () => {
    const { registerOrRotate } = await import("../src/routes/auth.ts");
    const { sql } = await import("../src/infra/db.ts");
    const fp = `test-fp-reuse-${crypto.randomUUID()}`;
    fingerprintsToCleanup.push(fp);

    const first = await registerOrRotate({
      machineName: "macbook-test",
      fingerprint: fp,
    });
    expect(first.reused_machine_id).toBe(false);
    expect(first.machine_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(first.token).toMatch(/^mneme_pat_/);

    const second = await registerOrRotate({
      machineName: "macbook-renamed-ignored",
      fingerprint: fp,
    });
    expect(second.reused_machine_id).toBe(true);
    expect(second.machine_id).toBe(first.machine_id);
    expect(second.machine_name).toBe("macbook-test"); // body name ignored on match
    expect(second.token).not.toBe(first.token); // rotated

    const rows = await sql<{ token_count_active: bigint; token_count_total: bigint }[]>`
        SELECT
          COUNT(*) FILTER (WHERE revoked_at IS NULL) AS token_count_active,
          COUNT(*) AS token_count_total
        FROM _ops.api_keys
        WHERE machine_id = ${first.machine_id}
      `;
    expect(Number(rows[0]!.token_count_active)).toBe(1);
    expect(Number(rows[0]!.token_count_total)).toBe(2); // first revoked, second active
  });

  test("no fingerprint: mints a fresh machine_id every call", async () => {
    const { registerOrRotate } = await import("../src/routes/auth.ts");
    const a = await registerOrRotate({
      machineName: "no-fp-a",
      fingerprint: null,
    });
    const b = await registerOrRotate({
      machineName: "no-fp-b",
      fingerprint: null,
    });
    expect(a.reused_machine_id).toBe(false);
    expect(b.reused_machine_id).toBe(false);
    expect(a.machine_id).not.toBe(b.machine_id);

    const { sql } = await import("../src/infra/db.ts");
    await sql`
        DELETE FROM _ops.api_keys
        WHERE machine_id IN (${a.machine_id}, ${b.machine_id})
      `;
  });

  test("fingerprint with no prior row: fresh machine_id, fingerprint stored", async () => {
    const { registerOrRotate } = await import("../src/routes/auth.ts");
    const { sql } = await import("../src/infra/db.ts");
    const fp = `test-fp-fresh-${crypto.randomUUID()}`;
    fingerprintsToCleanup.push(fp);

    const r = await registerOrRotate({
      machineName: "first-time",
      fingerprint: fp,
    });
    expect(r.reused_machine_id).toBe(false);

    const rows = await sql<{ machine_fingerprint: string | null }[]>`
        SELECT machine_fingerprint
        FROM _ops.api_keys
        WHERE machine_id = ${r.machine_id} AND revoked_at IS NULL
      `;
    expect(rows.length).toBe(1);
    expect(rows[0]!.machine_fingerprint).toBe(fp);
  });

  test("register prunes revoked_at > 1 day rows; keeps recent-revoked and active", async () => {
    const { registerOrRotate } = await import("../src/routes/auth.ts");
    const { sql, sha256Hex } = await import("../src/infra/db.ts");

    const fpStale = `test-fp-stale-${crypto.randomUUID()}`;
    const fpRecent = `test-fp-recent-${crypto.randomUUID()}`;
    const fpActive = `test-fp-active-${crypto.randomUUID()}`;
    const fpTrigger = `test-fp-trigger-${crypto.randomUUID()}`;
    fingerprintsToCleanup.push(fpStale, fpRecent, fpActive, fpTrigger);

    // Stale: revoked 2 days ago — should be DELETED.
    const staleHash = await sha256Hex("stale-tok");
    await sql`
      INSERT INTO _ops.api_keys (key_hash, name, machine_id, machine_fingerprint, revoked_at)
      VALUES (${staleHash}, 'stale', ${crypto.randomUUID()}, ${fpStale}, now() - interval '2 days')
    `;
    // Recent-revoked: revoked 1 hour ago — should be KEPT (inside 1-day buffer).
    const recentHash = await sha256Hex("recent-tok");
    await sql`
      INSERT INTO _ops.api_keys (key_hash, name, machine_id, machine_fingerprint, revoked_at)
      VALUES (${recentHash}, 'recent', ${crypto.randomUUID()}, ${fpRecent}, now() - interval '1 hour')
    `;
    // Active: never revoked — should be KEPT.
    const activeHash = await sha256Hex("active-tok");
    await sql`
      INSERT INTO _ops.api_keys (key_hash, name, machine_id, machine_fingerprint)
      VALUES (${activeHash}, 'active', ${crypto.randomUUID()}, ${fpActive})
    `;

    // Trigger the register path; the pruneStaleRevokedKeys call fires inside it.
    await registerOrRotate({ machineName: "trigger", fingerprint: fpTrigger });

    const rows = await sql<{ machine_fingerprint: string | null }[]>`
        SELECT machine_fingerprint
        FROM _ops.api_keys
        WHERE machine_fingerprint = ANY(${[fpStale, fpRecent, fpActive]})
      `;
    const surviving = rows.map((r) => r.machine_fingerprint);
    expect(surviving).not.toContain(fpStale);
    expect(surviving).toContain(fpRecent);
    expect(surviving).toContain(fpActive);
  });
});
