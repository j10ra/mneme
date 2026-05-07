// State-directory outbox.
//
// Each capture is one JSON file. The file's directory IS its state. Files
// move between states via atomic POSIX rename(). Each transition rewrites
// the file content (capture only -> capture + memories -> capture +
// memories + vectors), so a crash leaves the work in its last-completed
// state for resumption.
//
// Atomic write pattern: write to a sibling `.<name>.tmp` file, fsync, then
// rename. rename() is atomic on the same filesystem (POSIX guarantee),
// so list() never observes a half-written queue entry. list() filters
// dotfiles to be defensive against crashed-mid-write leftovers.

import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type OutboxState = "pending" | "extracted" | "embedded" | "failed";

const STATES: OutboxState[] = ["pending", "extracted", "embedded", "failed"];

export interface Outbox {
  root: string;
  writeRaw(id: string, data: unknown): Promise<void>;
  list(state: OutboxState): Promise<string[]>;
  read(id: string, state: OutboxState): Promise<unknown>;
  transition(
    id: string,
    from: OutboxState,
    to: OutboxState,
    newData: unknown,
  ): Promise<void>;
  delete(id: string, state: OutboxState): Promise<void>;
  markFailed(id: string, from: OutboxState, reason: string): Promise<void>;
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

  async function ensureDirs(): Promise<void> {
    if (initialized) return;
    for (const state of STATES) {
      await mkdir(join(rootPath, state), { recursive: true });
    }
    initialized = true;
  }

  return {
    root: rootPath,

    async writeRaw(id, data) {
      await ensureDirs();
      await atomicWrite(fileFor(rootPath, "pending", id), data);
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
  };
}
