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

  if (kind === "supersede") {
    if (!UUID_RE.test(target)) {
      Logger.warn(`supersede requested with invalid target uuid: ${target}`);
      return;
    }
    try {
      const clear = rawMeta.value === false;
      if (clear) {
        const updated = await exec<{ id: string }[]>`
          UPDATE memories SET meta = meta - 'superseded_by'
          WHERE id = ${target} AND archived_at IS NULL
          RETURNING id
        `;
        Logger.info(
          updated[0]
            ? `supersede cleared id=${target}`
            : `unsupersede requested but target not found: ${target}`,
        );
        return;
      }
      const newId = rawMeta.new_id;
      if (typeof newId !== "string" || !UUID_RE.test(newId)) {
        Logger.warn(`supersede requested with invalid new_id: ${String(newId)}`);
        return;
      }
      if (newId === target) {
        Logger.warn(`supersede requested with target === new_id: ${target}`);
        return;
      }
      // Both memories must exist and be live. No chronology check — a manual
      // supersede is user-asserted (see the spec); validateSupersedePairs is
      // the LLM path's rail, not this one.
      const present = await exec<{ id: string }[]>`
        SELECT id FROM memories
        WHERE id = ANY(${[target, newId]}) AND archived_at IS NULL
      `;
      if (present.length < 2) {
        Logger.warn(
          `supersede skipped: target or new_id missing/archived (target=${target} new_id=${newId})`,
        );
        return;
      }
      // Overwrite any existing superseded_by — a manual supersede is an
      // explicit re-point.
      const updated = await exec<{ id: string }[]>`
        UPDATE memories
        SET meta = meta || jsonb_build_object('superseded_by', ${newId}::text)
        WHERE id = ${target} AND archived_at IS NULL
        RETURNING id
      `;
      Logger.info(
        updated[0]
          ? `supersede actuated id=${target} superseded_by=${newId}`
          : `supersede requested but target not found: ${target}`,
      );
    } catch (e) {
      Logger.error(`supersede actuation failed for ${target}`, e);
    }
    return;
  }
}
