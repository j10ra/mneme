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

  test("supersede sets meta.superseded_by; value:false clears it; bad inputs are skipped", async () => {
    const { actuateRawMeta } = await import("../src/lib/actuate.ts");
    const { sql } = await import("../src/infra/db.ts");

    const machineId = "00000000-0000-0000-0000-00000000d101";
    const captureId = "00000000-0000-0000-0000-00000000d1ca";
    const oldId = "00000000-0000-0000-0000-00000000d1a0";
    const newId = "00000000-0000-0000-0000-00000000d1b0";
    const ghost = "00000000-0000-0000-0000-00000000d9ff";

    const seedMem = async (id: string) =>
      sql`
        INSERT INTO memories (
          id, capture_id, chunk_id, content, content_hash,
          embedding_model, kind, machine_id, harness
        ) VALUES (
          ${id}, ${captureId}, ${`chunk-${id}`}, ${`mem ${id}`}, ${`hash-${id}`},
          'test', 'note', ${machineId}, 'test'
        )
      `;

    const supersededBy = async (id: string) => {
      const [r] = await sql<{ s: string | null }[]>`
        SELECT meta->>'superseded_by' AS s FROM memories WHERE id = ${id}
      `;

      return r?.s ?? null;
    };

    try {
      await sql`
        INSERT INTO captures (id, content, content_sha256, source, machine_id, hostname, harness)
        VALUES (${captureId}, 'sup test', ${`sha-${captureId}`}, 'test',
                ${machineId}, 'testhost', 'test')
      `;
      await seedMem(oldId);
      await seedMem(newId);

      // set
      await actuateRawMeta(sql, { kind: "supersede", target: oldId, new_id: newId, value: true });
      expect(await supersededBy(oldId)).toBe(newId);

      // clear
      await actuateRawMeta(sql, { kind: "supersede", target: oldId, value: false });
      expect(await supersededBy(oldId)).toBeNull();

      // bad: new_id does not exist → skipped, no flag written
      await actuateRawMeta(sql, { kind: "supersede", target: oldId, new_id: ghost, value: true });
      expect(await supersededBy(oldId)).toBeNull();

      // bad: target === new_id → skipped
      await actuateRawMeta(sql, { kind: "supersede", target: oldId, new_id: oldId, value: true });
      expect(await supersededBy(oldId)).toBeNull();
    } finally {
      await sql`DELETE FROM memories WHERE capture_id = ${captureId}`;
      await sql`DELETE FROM captures WHERE id = ${captureId}`;
    }
  });
});
