// Daemon crystallize cycle.
//
// Each daemon runs this every 24h. The orchestration is HTTP-only:
//   1. POST /api/crystallize/lock         try to claim the window
//   2. (skip on 409)
//   3. GET  /api/crystallize/repos        discover repos with clusters
//   4. For each repo:
//      GET  /api/crystallize/candidates?repo=<repo>
//      synthesizeConcepts(repo, items) -- one Sonnet call per repo
//   5. POST /api/crystallize/concepts     server validates and writes
//
// The server holds the lock + the DB; the daemon holds the LLM cost.

import type { Hono } from "hono";
import { Logger, mnemeRoute } from "@mneme/core";
import type { ConceptDraft } from "./agents/claude.ts";
import type { DistilledCluster, DreamOutbox } from "./dream-outbox.ts";
import { EMBEDDER_MODEL } from "./embed.ts";
import { CRYSTALLIZE_MAX_CONCEPTS_PER_REPO, CRYSTALLIZE_WINDOW_HOURS } from "./infra/config.ts";

const WINDOW_SECONDS = CRYSTALLIZE_WINDOW_HOURS * 3600;

// Track the daemon's in-flight crystallize lock so the SIGTERM handler
// can release it before exit. Null when no cycle is in flight.
let activeWindow: number | null = null;

export function getActiveCrystallizeWindow(): number | null {
  return activeWindow;
}

function computeWindowKey(date = new Date()): number {
  return Math.floor(date.getTime() / 1000 / WINDOW_SECONDS);
}

export type ConceptSubmission = {
  concept_id: string;
  concept_type: string;
  title: string;
  body: string;
  tags: string[];
  related_to: string[];
  source_member_ids: string[];
  repo: string;
  embedding_model: string;
  body_embedding: number[];
};

export type CrystallizeCycleResult = {
  skipped: boolean;
  reason?: string;
  conceptsSubmitted?: number;
  conceptsWritten?: number;
};

export type CrystallizeDeps = {
  serverUrl: string;
  token: string;
  machineId: string;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  synthesize: (repo: string, items: { id: string; content: string }[]) => Promise<ConceptDraft[]>;
  /** Embed concept bodies so the resulting concept memories are
   *  semantically searchable. Optional only because tests inject a mock. */
  embed?: (texts: string[]) => Promise<number[][]>;
  /** Per-concept persistence. When provided, synthesize + embed output
   *  is written to outbox/crystallize/<window>/distilled/<id>.json before
   *  any submit attempt, so a daemon crash doesn't lose Sonnet output. */
  outbox?: DreamOutbox;
  /** Override the window for tests. Production calls computeWindowKey(). */
  windowKey?: number;
};

// ConceptEntry is persisted in the DreamOutbox. cluster_id maps to
// concept_id so each entry has a stable unique file key.
type ConceptEntry = ConceptDraft & {
  cluster_id: string;
  repo: string;
  body_embedding?: number[];
};

async function lockWindow(
  deps: CrystallizeDeps,
  windowKey: number,
): Promise<{ acquired: boolean; heldBy?: string }> {
  const response = await deps.fetch(`${deps.serverUrl}/api/crystallize/lock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deps.token}`,
    },
    body: JSON.stringify({ window_key: windowKey }),
  });

  if (response.status === 200) return { acquired: true };

  if (response.status === 409) {
    const body = (await response.json().catch(() => ({}))) as { heldBy?: string };

    return { acquired: false, heldBy: body.heldBy };
  }

  const detail = await response.text().catch(() => "");

  throw new Error(`lock returned ${response.status}: ${detail.slice(0, 500)}`);
}

async function fetchRepos(deps: CrystallizeDeps): Promise<string[]> {
  const response = await deps.fetch(`${deps.serverUrl}/api/crystallize/repos`, {
    method: "GET",
    headers: { Authorization: `Bearer ${deps.token}` },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    throw new Error(`repos returned ${response.status}: ${detail.slice(0, 500)}`);
  }

  return ((await response.json()) as { repos: string[] }).repos;
}

async function fetchCandidates(
  deps: CrystallizeDeps,
  repo: string,
): Promise<{ id: string; content: string }[]> {
  const url = `${deps.serverUrl}/api/crystallize/candidates?repo=${encodeURIComponent(repo)}`;
  const response = await deps.fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${deps.token}` },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    throw new Error(`candidates returned ${response.status}: ${detail.slice(0, 500)}`);
  }

  return ((await response.json()) as { items: { id: string; content: string }[] }).items ?? [];
}

async function submitConcepts(
  deps: Pick<CrystallizeDeps, "serverUrl" | "token" | "fetch">,
  windowKey: number,
  concepts: ConceptSubmission[],
): Promise<{ written: number; updated: number }> {
  const response = await deps.fetch(`${deps.serverUrl}/api/crystallize/concepts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deps.token}`,
    },
    body: JSON.stringify({ window_key: windowKey, concepts }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    throw new Error(`concepts returned ${response.status}: ${detail.slice(0, 500)}`);
  }

  return (await response.json()) as { written: number; updated: number };
}

export async function runCrystallizeCycle(deps: CrystallizeDeps): Promise<CrystallizeCycleResult> {
  const cycleStart = Date.now();
  const windowKey = deps.windowKey ?? computeWindowKey();

  Logger.info("crystallize: cycle start", { window_key: windowKey });
  Logger.info("crystallize: attempting lock", { window_key: windowKey });

  const lock = await lockWindow(deps, windowKey);

  if (!lock.acquired) {
    Logger.info("crystallize: skipped (lock held)", {
      window_key: windowKey,
      held_by: lock.heldBy ?? "unknown",
    });

    return { skipped: true, reason: `held by ${lock.heldBy ?? "unknown"}` };
  }

  Logger.info("crystallize: lock acquired", { window_key: windowKey });
  activeWindow = windowKey;

  const repos = await fetchRepos(deps);

  Logger.info("crystallize: repos discovered", { count: repos.length });

  // Stage 1: synthesize (Sonnet) per repo. Each successful repo's
  // concepts are persisted to outbox/crystallize/<window>/distilled/
  // before moving on, so a crash loses at most one in-flight call.
  const allEntries: ConceptEntry[] = [];

  for (const repo of repos) {
    const items = await fetchCandidates(deps, repo);

    if (items.length === 0) {
      Logger.info("crystallize: no candidates for repo", { repo });
      continue;
    }

    Logger.info("crystallize: synthesizing concepts", { repo, items: items.length });
    const tSynth = Date.now();

    try {
      const drafts = await deps.synthesize(repo, items);
      // Defensive cap: the prompt asks for at most N concepts, but a
      // misbehaving LLM could return more. Truncate before any
      // downstream work so embedding, related_to resolution, and
      // submission all operate on the capped set.
      const capped = drafts.slice(0, CRYSTALLIZE_MAX_CONCEPTS_PER_REPO);

      Logger.info("crystallize: synthesized", {
        repo,
        concepts: capped.length,
        dropped: drafts.length - capped.length,
        ms: Date.now() - tSynth,
      });

      // Resolve related_to concept titles -> concept_id slugs within
      // the same repo's batch. Titles that don't match a sibling draft
      // (including ones cut by the cap) are dropped.
      const titleToId = new Map<string, string>();

      for (const d of capped) titleToId.set(d.title, d.concept_id);

      for (const d of capped) {
        const resolvedRelatedTo = d.related_to
          .map((title) => titleToId.get(title))
          .filter((id): id is string => id !== undefined);

        const entry: ConceptEntry = {
          ...d,
          cluster_id: d.concept_id,
          repo,
          related_to: resolvedRelatedTo,
        };

        if (deps.outbox) {
          await deps.outbox.put(windowKey, "distilled", entry as unknown as DistilledCluster);
        }

        allEntries.push(entry);
      }
    } catch (err) {
      Logger.warn("crystallize: synthesize failed for repo", err, { repo });
    }
  }

  // Stage 2: embed each concept body. Persist to embedded/ after each
  // success; entries that fail embed stay in distilled/ for resume.
  for (const entry of allEntries) {
    if (entry.body_embedding) continue; // already embedded (e.g. resumed)
    if (!deps.embed) continue;

    try {
      const [vec] = await deps.embed([entry.body]);

      if (vec) entry.body_embedding = vec;
    } catch (err) {
      Logger.warn("crystallize: embed failed", err, { concept_id: entry.concept_id });
      continue; // leave in distilled/ for resume
    }

    if (deps.outbox) {
      await deps.outbox.transition(
        windowKey,
        "distilled",
        "embedded",
        entry as unknown as DistilledCluster,
      );
    }
  }

  // Stage 3: submit concepts that have embeddings. Concepts that failed
  // embed are left in distilled/ and will be retried on next startup.
  const submissions: ConceptSubmission[] = allEntries
    .filter((e) => e.body_embedding && e.body_embedding.length > 0)
    .map((e) => ({
      concept_id: e.concept_id,
      concept_type: e.concept_type,
      title: e.title,
      body: e.body,
      tags: e.tags,
      related_to: e.related_to,
      source_member_ids: e.source_member_ids,
      repo: e.repo,
      embedding_model: EMBEDDER_MODEL,
      body_embedding: e.body_embedding ?? [],
    }));

  Logger.info("crystallize: submitting concepts", { count: submissions.length });

  const result = await submitConcepts(deps, windowKey, submissions);

  Logger.info("crystallize: concepts written", {
    submitted: submissions.length,
    written: result.written,
    updated: result.updated,
  });

  // Server confirmed write -> drop the embedded outbox files. Entries
  // still in distilled/ (failed embed) stay for resume on next startup.
  if (deps.outbox) {
    for (const entry of allEntries) {
      if (entry.body_embedding) {
        await deps.outbox.delete(windowKey, "embedded", entry.concept_id);
      }
    }

    await deps.outbox.cleanupWindow(windowKey);
  }

  Logger.info("crystallize: cycle done", {
    window_key: windowKey,
    submitted: submissions.length,
    written: result.written,
    total_ms: Date.now() - cycleStart,
  });
  activeWindow = null;

  return {
    skipped: false,
    conceptsSubmitted: submissions.length,
    conceptsWritten: result.written,
  };
}

/** Resume any unfinished crystallize cycles persisted in
 *  outbox/crystallize/<window>/. Called on daemon startup. For each
 *  window with outbox files: embed any distilled-but-not-yet-embedded
 *  concepts, then re-submit the embedded set. Skips windows with no
 *  files. Lock state is not re-acquired — the original claim either
 *  still holds or has been auto-reaped; the submit will surface an error
 *  and the files stay for human inspection. */
export async function resumeCrystallizeCycles(
  deps: Pick<CrystallizeDeps, "serverUrl" | "token" | "machineId" | "fetch" | "embed" | "outbox">,
): Promise<{ resumed: number; written: number }> {
  if (!deps.outbox) return { resumed: 0, written: 0 };

  const windows = await deps.outbox.listWindows();
  let resumedConcepts = 0;
  let writtenConcepts = 0;

  for (const windowKey of windows) {
    const distilledIds = await deps.outbox.list(windowKey, "distilled");
    const embeddedIds = await deps.outbox.list(windowKey, "embedded");
    const totalQueued = distilledIds.length + embeddedIds.length;

    if (totalQueued === 0) {
      await deps.outbox.cleanupWindow(windowKey);
      continue;
    }

    Logger.info("crystallize: resuming window", {
      window_key: windowKey,
      distilled: distilledIds.length,
      embedded: embeddedIds.length,
    });

    // Embed distilled entries first, then transition to embedded/.
    for (const id of distilledIds) {
      const entry = (await deps.outbox.read(windowKey, "distilled", id)) as unknown as ConceptEntry;

      if (!entry.body_embedding && deps.embed) {
        try {
          const [vec] = await deps.embed([entry.body]);

          if (vec) entry.body_embedding = vec;
        } catch (err) {
          Logger.warn("crystallize: resume embed failed", err, { concept_id: id });
        }
      }

      await deps.outbox.transition(
        windowKey,
        "distilled",
        "embedded",
        entry as unknown as DistilledCluster,
      );
    }

    // Re-submit everything in embedded/ as one batch.
    const allIds = await deps.outbox.list(windowKey, "embedded");
    const entries: ConceptEntry[] = [];

    for (const id of allIds) {
      entries.push((await deps.outbox.read(windowKey, "embedded", id)) as unknown as ConceptEntry);
    }

    const submissions: ConceptSubmission[] = entries
      .filter((e) => e.body_embedding && e.body_embedding.length > 0)
      .map((e) => ({
        concept_id: e.concept_id,
        concept_type: e.concept_type,
        title: e.title,
        body: e.body,
        tags: e.tags,
        related_to: e.related_to,
        source_member_ids: e.source_member_ids,
        repo: e.repo,
        embedding_model: EMBEDDER_MODEL,
        body_embedding: e.body_embedding ?? [],
      }));

    try {
      const result = await submitConcepts(deps, windowKey, submissions);

      Logger.info("crystallize: resume submitted", {
        window_key: windowKey,
        submitted: submissions.length,
        written: result.written,
      });
      resumedConcepts += submissions.length;
      writtenConcepts += result.written;

      for (const id of allIds) {
        await deps.outbox.delete(windowKey, "embedded", id);
      }

      await deps.outbox.cleanupWindow(windowKey);
    } catch (err) {
      Logger.warn("crystallize: resume submit failed, files retained", err, {
        window_key: windowKey,
      });
    }
  }

  return { resumed: resumedConcepts, written: writtenConcepts };
}

export function mountCrystallizeRoute(
  app: Hono,
  runCrystallize: () => Promise<CrystallizeCycleResult>,
): void {
  app.post("/crystallize/run", mnemeRoute("daemon.crystallize_run"), async (c) => {
    try {
      const result = await runCrystallize();

      Logger.info("crystallize cycle (manual)", result);

      return c.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      Logger.error("crystallize cycle (manual) failed", err);

      return c.json({ error: msg }, 500);
    }
  });
}
