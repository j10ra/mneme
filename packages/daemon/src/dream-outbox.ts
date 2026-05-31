// Dream outbox - per-cluster persistence so a daemon crash mid-cycle
// doesn't lose Sonnet-generated content.
//
//   ~/.mneme/outbox/dream/<window_key>/
//     distilled/<cluster_id>.json   { member_ids, title, summary, supersede_pairs }
//     embedded/<cluster_id>.json    distilled + summary_embedding
//     failed/<cluster_id>.json
//
// Stage transitions are atomic POSIX renames (write to .tmp, fsync,
// rename). cluster_id is sha256(sorted_member_ids.join(',')) so the
// same component re-identified after restart maps to the same file.
//
// We deliberately do NOT persist a "pending" stage. The Sonnet call IS
// the expensive operation; components are deterministic from candidates
// (same daemon, same server data) so re-deriving them costs nothing.
// Persistence starts at distilled/ where the LLM output exists.
//
// On successful server submit, embedded/<id>.json is deleted. Empty
// window directories are cleaned up by the resume helper.

import { mkdir, readFile, readdir, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SupersedePair } from "./agents/types.ts";

export type DreamStage = "distilled" | "embedded" | "failed";

export type DistilledCluster = {
  cluster_id: string;
  member_ids: string[];
  title: string;
  summary: string;
  supersede_pairs?: SupersedePair[];
  /** Set when the file is in `embedded/`. Absent in `distilled/`. */
  summary_embedding?: number[];
};

export interface DreamOutbox {
  root: string;
  /** Atomic write to <window>/<stage>/<cluster_id>.json */
  put(windowKey: number, stage: DreamStage, cluster: DistilledCluster): Promise<void>;
  /** Move from one stage to another with updated content. */
  transition(
    windowKey: number,
    from: DreamStage,
    to: DreamStage,
    cluster: DistilledCluster,
  ): Promise<void>;
  /** List cluster_ids present in a stage. */
  list(windowKey: number, stage: DreamStage): Promise<string[]>;
  /** Read the full record for a cluster at a stage. */
  read(windowKey: number, stage: DreamStage, clusterId: string): Promise<DistilledCluster>;
  /** Drop a cluster's record from a stage (e.g. after server confirms). */
  delete(windowKey: number, stage: DreamStage, clusterId: string): Promise<void>;
  /** Move to failed/ with a reason file alongside. */
  markFailed(windowKey: number, from: DreamStage, clusterId: string, reason: string): Promise<void>;
  /** Walk the whole dream/ tree; useful for resume-on-startup. */
  listWindows(): Promise<number[]>;
  /** Drop an empty window directory. No-op if not empty. */
  cleanupWindow(windowKey: number): Promise<void>;
}

const STAGES: DreamStage[] = ["distilled", "embedded", "failed"];

function clusterFile(
  root: string,
  windowKey: number,
  stage: DreamStage,
  clusterId: string,
): string {
  return join(root, String(windowKey), stage, `${clusterId}.json`);
}

async function atomicWrite(path: string, payload: unknown): Promise<void> {
  const dir = path.substring(0, path.lastIndexOf("/"));
  const name = path.substring(path.lastIndexOf("/") + 1);
  const tmp = join(dir, `.${name}.tmp`);

  await mkdir(dir, { recursive: true });
  await writeFile(tmp, JSON.stringify(payload));
  await rename(tmp, path);
}

export function createDreamOutbox(rootPath: string): DreamOutbox {
  async function ensureWindow(windowKey: number): Promise<void> {
    for (const stage of STAGES) {
      await mkdir(join(rootPath, String(windowKey), stage), { recursive: true });
    }
  }

  return {
    root: rootPath,

    async put(windowKey, stage, cluster) {
      await ensureWindow(windowKey);
      await atomicWrite(clusterFile(rootPath, windowKey, stage, cluster.cluster_id), cluster);
    },

    async transition(windowKey, from, to, cluster) {
      await ensureWindow(windowKey);
      const src = clusterFile(rootPath, windowKey, from, cluster.cluster_id);

      // Read just to surface ENOENT clearly if the source is gone.
      await readFile(src);
      await atomicWrite(clusterFile(rootPath, windowKey, to, cluster.cluster_id), cluster);
      await rm(src);
    },

    async list(windowKey, stage) {
      try {
        const entries = await readdir(join(rootPath, String(windowKey), stage));

        return entries
          .filter((f) => !f.startsWith(".") && f.endsWith(".json"))
          .map((f) => f.slice(0, -".json".length));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw err;
      }
    },

    async read(windowKey, stage, clusterId) {
      const buf = await readFile(clusterFile(rootPath, windowKey, stage, clusterId), "utf8");

      return JSON.parse(buf) as DistilledCluster;
    },

    async delete(windowKey, stage, clusterId) {
      await rm(clusterFile(rootPath, windowKey, stage, clusterId), {
        force: true,
      });
    },

    async markFailed(windowKey, from, clusterId, reason) {
      await ensureWindow(windowKey);
      const src = clusterFile(rootPath, windowKey, from, clusterId);
      const cluster = JSON.parse(await readFile(src, "utf8")) as DistilledCluster;

      await atomicWrite(clusterFile(rootPath, windowKey, "failed", clusterId), cluster);
      await writeFile(
        join(rootPath, String(windowKey), "failed", `${clusterId}.error.txt`),
        reason,
      );
      await rm(src);
    },

    async listWindows() {
      try {
        const entries = await readdir(rootPath);

        return entries
          .filter((d) => /^\d+$/.test(d))
          .map((d) => Number(d))
          .sort((a, b) => a - b);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw err;
      }
    },

    async cleanupWindow(windowKey) {
      // Only clean if every stage dir is empty (besides the failed/
      // directory which we leave for human inspection if it has content).
      const distilled = await this.list(windowKey, "distilled");
      const embedded = await this.list(windowKey, "embedded");
      const failed = await this.list(windowKey, "failed");

      if (distilled.length > 0 || embedded.length > 0 || failed.length > 0) {
        return;
      }

      for (const stage of STAGES) {
        try {
          await rmdir(join(rootPath, String(windowKey), stage));
        } catch {
          // ignore
        }
      }

      try {
        await rmdir(join(rootPath, String(windowKey)));
      } catch {
        // ignore
      }
    },
  };
}

/** Deterministic cluster id from member ids. Used as the file name in
 *  the outbox AND inside the daemon as the in-memory key, so a cluster
 *  re-identified after a daemon restart maps to the same file. */
export async function clusterIdFor(memberIds: string[]): Promise<string> {
  const sorted = [...memberIds].sort();
  const joined = sorted.join(",");
  const buf = new TextEncoder().encode(joined);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";

  for (const b of bytes) hex += b.toString(16).padStart(2, "0");

  return hex;
}
