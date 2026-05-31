#!/usr/bin/env bun
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL not set (check .env)");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

const sql = postgres(url, { max: 1, connect_timeout: 10 });

try {
  // Bootstrap _ops schema + schema_migrations tracking table (idempotent).
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

  if (files.length === 0) {
    console.log("no migration files found in", migrationsDir);
    process.exit(0);
  }

  let ranCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`✓ ${file} (already applied)`);
      continue;
    }

    const sqlText = readFileSync(join(migrationsDir, file), "utf8");

    if (dryRun) {
      console.log(`would apply: ${file} (${sqlText.length} bytes)`);
      continue;
    }

    process.stdout.write(`applying ${file} ... `);
    await sql.begin(async (tx) => {
      await tx.unsafe(sqlText);
      await tx`INSERT INTO _ops.schema_migrations (filename) VALUES (${file})`;
    });
    console.log("ok");
    ranCount++;
  }

  console.log(dryRun ? "dry-run complete" : `${ranCount} migration(s) applied`);
} catch (err) {
  console.error("migration failed:", err instanceof Error ? err.message : err);
  process.exit(2);
} finally {
  await sql.end();
}
