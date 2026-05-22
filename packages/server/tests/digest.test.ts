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
