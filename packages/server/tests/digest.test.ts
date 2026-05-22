// Digest worker SQL smoke tests. Seed isolated rows under a
// deterministic capture_id, assert, tear down. Skipped without a DB.

import { describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("digest (requires DATABASE_URL)", () => {
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
            'test', 'cluster', '00000000-0000-0000-0000-0000000e1d99', 'test', ${sql.json(JSON.parse(meta))})
        `;
      };
      await insertCluster(fresh, '{"last_digested_at":"2999-01-01T00:00:00.000Z"}');
      await insertCluster(never, "{}");

      const window = await selectDigestClusterWindow(10_000);
      expect(window.indexOf(never)).toBeGreaterThanOrEqual(0);
      expect(window.indexOf(never)).toBeLessThan(window.indexOf(fresh));
    } finally {
      await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
      await sql`DELETE FROM captures WHERE id = ${captureId}`;
    }
  });

  test("stampDigested writes meta.last_digested_at on the given ids", async () => {
    const { stampDigested } = await import("../src/worker/digest.ts");
    const { sql } = await import("../src/infra/db.ts");

    const captureId = "00000000-0000-0000-0000-0000000e0dca";
    const idA = "00000000-0000-0000-0000-0000000e0da1";
    const idB = "00000000-0000-0000-0000-0000000e0da2";

    try {
      await sql`
        INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
        VALUES (${captureId}, 'seed', ${`sha-${captureId}`}, 'test',
                '00000000-0000-0000-0000-0000000e0d01', 'testhost', 'test')
      `;
      for (const id of [idA, idB]) {
        await sql`
          INSERT INTO memories (id, capture_id, chunk_id, content, content_hash,
            embedding_model, kind, machine_id, harness)
          VALUES (${id}, ${captureId}, ${`chunk-${id}`}, 'c', ${`hash-${id}`},
            'test', 'note', '00000000-0000-0000-0000-0000000e0d01', 'test')
        `;
      }

      await stampDigested([idA, idB]);

      const rows = await sql<{ stamped: string | null }[]>`
        SELECT meta->>'last_digested_at' AS stamped FROM memories WHERE id = ANY(${[idA, idB]})
      `;
      expect(rows).toHaveLength(2);
      for (const r of rows) expect(r.stamped).not.toBeNull();
    } finally {
      await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
      await sql`DELETE FROM captures WHERE id = ${captureId}`;
    }
  });
});
