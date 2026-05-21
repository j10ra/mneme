// Shared actuation for side-effecting captures. The slash commands
// (pin/unpin, archive/unarchive, supersede/unsupersede) post a capture
// whose raw_meta carries { kind, target, ... }; the server runs the side
// effect here. Called from /api/capture (routes/ingest.ts) and /api/bundle
// (routes/bundle.ts) so daemon-routed and slash-routed captures behave
// identically.
//
// Fail-soft: a malformed actuation logs and is skipped — it never throws
// into the capture ingest path.

import { Logger } from "@mneme/core";
import type postgres from "postgres";

/** A postgres.js executor — the module `sql`, or a `tx` from `sql.begin`. */
type Exec = postgres.ISql<{}>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function actuateRawMeta(
  exec: Exec,
  rawMeta: Record<string, unknown> | undefined | null,
): Promise<void> {
  if (!rawMeta || typeof rawMeta !== "object") return;
  const kind = rawMeta.kind;
  const target = rawMeta.target;
  if (typeof target !== "string") return;

  if (kind === "pin") {
    if (!UUID_RE.test(target)) {
      Logger.warn(`pin requested with invalid uuid: ${target}`);
      return;
    }
    try {
      const value = rawMeta.value !== false;
      const updated = await exec<{ id: string }[]>`
        UPDATE memories
        SET meta = jsonb_set(meta, '{pinned}', to_jsonb(${value}::boolean), true)
        WHERE id = ${target} AND archived_at IS NULL
        RETURNING id
      `;
      Logger.info(
        updated[0]
          ? `pin actuated id=${target} value=${value}`
          : `pin requested but target not found: ${target}`,
      );
    } catch (e) {
      Logger.error(`pin actuation failed for ${target}`, e);
    }
    return;
  }

  if (kind === "archive") {
    if (!UUID_RE.test(target)) {
      Logger.warn(`archive requested with invalid uuid: ${target}`);
      return;
    }
    try {
      const archive = rawMeta.value !== false;
      const updated = archive
        ? await exec<{ id: string }[]>`
            UPDATE memories SET archived_at = NOW()
            WHERE id = ${target} AND archived_at IS NULL
            RETURNING id
          `
        : await exec<{ id: string }[]>`
            UPDATE memories SET archived_at = NULL
            WHERE id = ${target} AND archived_at IS NOT NULL
            RETURNING id
          `;
      Logger.info(
        updated[0]
          ? `archive actuated id=${target} value=${archive}`
          : `archive requested but target not found or already in state: ${target}`,
      );
    } catch (e) {
      Logger.error(`archive actuation failed for ${target}`, e);
    }
    return;
  }
}
