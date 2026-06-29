#!/usr/bin/env bun
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

export type MigrateResult = { applied: number; pending: string[] };

// Apply every pending migration in filename order, recording each in
// _ops.schema_migrations. Idempotent: already-applied files are skipped.
// Callable from the server boot path (self-migrating deploys) as well as
// the CLI. migrationsDir is resolved from THIS file, so the caller's
// location does not matter.
export async function runMigrations(
  url: string,
  opts: { dryRun?: boolean } = {},
): Promise<MigrateResult> {
  const dryRun = opts.dryRun ?? false;
  const sql = postgres(url, { max: 1, connect_timeout: 10 });

  try {
    await sql`CREATE SCHEMA IF NOT EXISTS _ops`;
    await sql`
      CREATE TABLE IF NOT EXISTS _ops.schema_migrations (
        filename    TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const appliedRows = await sql<{ filename: string }[]>`
      SELECT filename FROM _ops.schema_migrations
    `;
    const applied = new Set(appliedRows.map((r) => r.filename));

    const files = readdirSync(migrationsDir)
      .filter((f) => /^\d+.*\.sql$/.test(f))
      .sort();

    const pending: string[] = [];
    let ranCount = 0;

    for (const file of files) {
      if (applied.has(file)) continue;
      pending.push(file);

      if (dryRun) continue;

      const sqlText = readFileSync(join(migrationsDir, file), "utf8");

      await sql.begin(async (tx) => {
        await tx.unsafe(sqlText);
        await tx`INSERT INTO _ops.schema_migrations (filename) VALUES (${file})`;
      });
      ranCount++;
    }

    return { applied: ranCount, pending };
  } finally {
    await sql.end();
  }
}

// CLI entry: `bun scripts/migrate.ts [--dry-run]`.
if (import.meta.main) {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error("DATABASE_URL not set (check .env)");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");

  try {
    const { applied, pending } = await runMigrations(url, { dryRun });

    if (dryRun) {
      for (const f of pending) console.log(`would apply: ${f}`);
      console.log("dry-run complete");
    } else {
      for (const f of pending) console.log(`applied ${f}`);
      console.log(`${applied} migration(s) applied`);
    }
  } catch (err) {
    console.error("migration failed:", err instanceof Error ? err.message : err);
    process.exit(2);
  }
}
