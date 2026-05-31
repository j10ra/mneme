// State-directory outbox. Stages mirror the server-side ingest pipeline:
//
//   captured/      raw event from hook (post-scrub, pre-dedup)
//   observations/  post-Haiku extract (memories[] populated)
//   embedded/      post-bge embed (memories[].embedding populated)
//   failed/        terminal — operator inspection
//
// Files move between states via atomic POSIX rename(). Each transition
// rewrites the file content (raw → +memories → +vectors), so a crash
// leaves the work in its last-completed state for resumption.
//
// Atomic write pattern: write to a sibling `.<name>.tmp` file, fsync, then
// rename. rename() is atomic on the same filesystem (POSIX guarantee),
// so list() never observes a half-written queue entry. list() filters
// dotfiles to be defensive against crashed-mid-write leftovers.

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type OutboxState = "captured" | "observations" | "embedded" | "failed";

const STATES: OutboxState[] = ["captured", "observations", "embedded", "failed"];

// Migration map for the pre-rename layout (pending/ → captured/,
// extracted/ → observations/). Runs once on first ensureDirs(); no-op
// thereafter. Atomic mv at the directory level — files keep their
// content and ids.
const LEGACY_MOVES: Array<{ from: string; to: OutboxState }> = [
  { from: "pending", to: "captured" },
  { from: "extracted", to: "observations" },
];

export interface Outbox {
  root: string;
  writeRaw(id: string, data: unknown): Promise<void>;
  list(state: OutboxState): Promise<string[]>;
  read(id: string, state: OutboxState): Promise<unknown>;
  transition(id: string, from: OutboxState, to: OutboxState, newData: unknown): Promise<void>;
  delete(id: string, state: OutboxState): Promise<void>;
  markFailed(id: string, from: OutboxState, reason: string): Promise<void>;
  /** On daemon startup: move all failed/ entries back to their inferred
   *  origin stage so they get a fresh retry budget. Returns the count moved. */
  rehydrateFailed(): Promise<number>;
}

function fileFor(root: string, state: OutboxState, id: string): string {
  return join(root, state, `${id}.json`);
}

async function atomicWrite(path: string, data: unknown): Promise<void> {
  const dir = path.substring(0, path.lastIndexOf("/"));
  const name = path.substring(path.lastIndexOf("/") + 1);
  const tmp = join(dir, `.${name}.tmp`);

  await writeFile(tmp, JSON.stringify(data));
  await rename(tmp, path);
}

export function createOutbox(rootPath: string): Outbox {
  let initialized = false;

  async function migrateLegacy(): Promise<void> {
    for (const { from, to } of LEGACY_MOVES) {
      const oldDir = join(rootPath, from);
      const newDir = join(rootPath, to);

      if (!existsSync(oldDir)) continue;

      // If the new dir doesn't exist yet, do a directory-level rename —
      // O(1) regardless of file count. If it exists (mid-migration crash
      // or already-migrated install), move file-by-file.
      if (!existsSync(newDir)) {
        await rename(oldDir, newDir);
      } else {
        const entries = await readdir(oldDir);

        for (const f of entries) {
          await rename(join(oldDir, f), join(newDir, f));
        }

        await rm(oldDir, { recursive: true, force: true });
      }
    }
  }

  async function ensureDirs(): Promise<void> {
    if (initialized) return;
    await migrateLegacy();

    for (const state of STATES) {
      await mkdir(join(rootPath, state), { recursive: true });
    }

    initialized = true;
  }

  return {
    root: rootPath,

    async writeRaw(id, data) {
      await ensureDirs();
      await atomicWrite(fileFor(rootPath, "captured", id), data);
    },

    async list(state) {
      await ensureDirs();
      const entries = await readdir(join(rootPath, state));

      return entries
        .filter((f) => !f.startsWith(".") && f.endsWith(".json"))
        .map((f) => f.slice(0, -".json".length));
    },

    async read(id, state) {
      const buf = await readFile(fileFor(rootPath, state, id), "utf8");

      return JSON.parse(buf);
    },

    async transition(id, from, to, newData) {
      await ensureDirs();
      // Source-file existence check: rename() will fail with ENOENT if
      // the source is missing, but we surface a clearer error early.
      const src = fileFor(rootPath, from, id);

      await readFile(src);

      // Write the enriched content into the destination state via the
      // atomic-tmp pattern, then unlink the source. Order matters: the
      // destination must be present before the source is removed so a
      // crash between the two leaves a duplicate (recoverable) rather
      // than a missing entry (lost work).
      await atomicWrite(fileFor(rootPath, to, id), newData);
      await rm(src);
    },

    async delete(id, state) {
      await rm(fileFor(rootPath, state, id), { force: true });
    },

    async markFailed(id, from, reason) {
      await ensureDirs();
      const src = fileFor(rootPath, from, id);
      const data = JSON.parse(await readFile(src, "utf8"));

      await atomicWrite(fileFor(rootPath, "failed", id), data);
      await writeFile(join(rootPath, "failed", `${id}.error.txt`), reason);
      await rm(src);
    },

    async rehydrateFailed() {
      await ensureDirs();
      const ids = await this.list("failed");
      let moved = 0;

      for (const id of ids) {
        try {
          const data = await this.read(id, "failed");
          const target = inferOriginStage(data);

          await atomicWrite(fileFor(rootPath, target, id), data);
          await rm(fileFor(rootPath, "failed", id), { force: true });
          await rm(join(rootPath, "failed", `${id}.error.txt`), {
            force: true,
          });
          moved++;
        } catch {
          // Leave it — don't lose the file if shape is unreadable.
        }
      }

      return moved;
    },
  };
}

function inferOriginStage(data: unknown): "captured" | "observations" | "embedded" {
  if (data && typeof data === "object" && "capture" in data) {
    const memories = (data as { memories?: unknown[] }).memories;

    if (
      Array.isArray(memories) &&
      memories.some((m) => m && typeof m === "object" && "embedding" in (m as object))
    ) {
      return "embedded";
    }

    return "observations";
  }

  return "captured";
}
