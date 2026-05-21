// Tests for actuateRawMeta — the shared pin/archive/supersede actuation.
import { describe, expect, test } from "bun:test";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("actuateRawMeta (requires DATABASE_URL)", () => {
  test("pin actuation flips meta.pinned; archive sets archived_at", async () => {
    const { actuateRawMeta } = await import("../src/lib/actuate.ts");
    const { sql } = await import("../src/infra/db.ts");

    const machineId = "00000000-0000-0000-0000-ac700000000a";
    const captureId = "00000000-0000-0000-0000-ac700000000c";
    const memId = "00000000-0000-0000-0000-ac700000000e";

    try {
      await sql`
        INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
        VALUES (${captureId}, 'actuate test', ${`sha-${captureId}`}, 'test',
                ${machineId}, 'testhost', 'test')
      `;
      await sql`
        INSERT INTO memories (
          id, capture_id, chunk_id, content, content_hash,
          embedding_model, kind, machine_id, harness
        ) VALUES (
          ${memId}, ${captureId}, ${`chunk-${memId}`}, 'actuate mem', ${`hash-${memId}`},
          'test', 'note', ${machineId}, 'test'
        )
      `;

      await actuateRawMeta(sql, { kind: "pin", target: memId, value: true });
      const [pinned] = await sql<{ pinned: boolean | null }[]>`
        SELECT (meta->>'pinned')::boolean AS pinned FROM memories WHERE id = ${memId}
      `;
      expect(pinned?.pinned).toBe(true);

      await actuateRawMeta(sql, { kind: "archive", target: memId, value: true });
      const [archived] = await sql<{ archived: Date | null }[]>`
        SELECT archived_at AS archived FROM memories WHERE id = ${memId}
      `;
      expect(archived?.archived).not.toBeNull();
    } finally {
      const { sql } = await import("../src/infra/db.ts");
      await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
      await sql`DELETE FROM captures WHERE id = ${captureId}`;
    }
  });
});
