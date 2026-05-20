// Shared supersede-pair validator. A `meta.superseded_by` write is only
// legal if the "old" memory is strictly older than the "new" one and both
// ids are in the candidate set the pair was drawn from. Pure data +
// arithmetic — no DB, no LLM, no globals — so callers (writeClusters,
// digest) drive it deterministically and own their own logging.
//
// This is the single definition of "is this supersede legal". The LLM
// proposes pairs; this function is the structural gate before the write.

import type { SupersedePair } from "../llm/types.ts";

/** A memory eligible to appear in a supersede pair. `created_at` accepts a
 *  Date (from a pg query) or an ISO string (from an LLM candidate batch). */
export type SupersedeCandidateRef = { id: string; created_at: string | Date };

export type SupersedeRejection = { pair: SupersedePair; reason: string };

export type SupersedeValidation = {
  valid: SupersedePair[];
  rejected: SupersedeRejection[];
};

/** Partition `pairs` into structurally-legal and rejected. A pair is valid
 *  iff: old_id !== new_id; both ids are in `candidates`; and old_id's
 *  created_at is strictly older than new_id's. Equal timestamps cannot
 *  establish direction, so they are rejected. */
export function validateSupersedePairs(
  pairs: SupersedePair[],
  candidates: Iterable<SupersedeCandidateRef>,
): SupersedeValidation {
  const tsById = new Map<string, number>();
  for (const c of candidates) {
    tsById.set(c.id, new Date(c.created_at).getTime());
  }

  const valid: SupersedePair[] = [];
  const rejected: SupersedeRejection[] = [];

  for (const pair of pairs) {
    if (pair.old_id === pair.new_id) {
      rejected.push({ pair, reason: "old_id equals new_id" });
      continue;
    }
    const oldTs = tsById.get(pair.old_id);
    const newTs = tsById.get(pair.new_id);
    if (oldTs === undefined || newTs === undefined) {
      rejected.push({ pair, reason: "id not in candidate set" });
      continue;
    }
    if (!(oldTs < newTs)) {
      rejected.push({ pair, reason: "old_id is not older than new_id" });
      continue;
    }
    valid.push(pair);
  }

  return { valid, rejected };
}
