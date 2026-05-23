// /api/bundle - the only ingest path under the daemon model.
//
// Receives a complete unit from the daemon: { capture, memories[] }
// where every memory already carries its embedding (EMBEDDER_DIM-sized
// float array, currently 384), content_hash, chunk_id, and provenance
// meta. Server inserts in a single transaction. Idempotent on
// (content_sha256, machine_id) for the capture and on chunk_id for
// memories, so retried pushes are safe.
//
// machine_id is server-stamped from the bearer token; the body's
// machine_id (if any) is ignored. Same defense-in-depth pattern as
// /api/capture today.
//
// Pin actuation (when capture.raw_meta.kind = "pin" and meta.target is
// a UUID) runs inside the same transaction, preserving the existing
// /api/capture semantic without a separate /api/pin route.

import { Hono } from "hono";
import { Logger, currentAuth, mnemeRoute, requireAuth } from "@mneme/core";
import { sql } from "../infra/db.ts";
import { actuateRawMeta } from "../lib/actuate.ts";
import { EMBEDDER_DIM } from "../infra/config.ts";

type CaptureBody = {
  content: string;
  content_sha256: string;
  source: string;
  hostname: string;
  repo: string | null;
  harness: string;
  agent: string | null;
  session_id: string | null;
  topics: string[];
  private: boolean;
  raw_meta: Record<string, unknown>;
};

type MemoryBody = {
  content: string;
  content_hash: string;
  chunk_id: string;
  embedding: number[];
  embedding_model: string;
  kind: string;
  importance: number;
  topics: string[];
  meta: Record<string, unknown>;
};

export type BundleBody = {
  capture: CaptureBody;
  memories: MemoryBody[];
};

export type ValidationResult = { ok: true; bundle: BundleBody } | { ok: false; error: string };

const REQUIRED_CAPTURE_STRINGS = [
  "content",
  "content_sha256",
  "source",
  "hostname",
  "harness",
] as const;

export function validateBundleBody(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "body must be an object" };
  }
  const body = input as { capture?: unknown; memories?: unknown };

  if (!body.capture || typeof body.capture !== "object") {
    return { ok: false, error: "capture required" };
  }
  const cap = body.capture as Record<string, unknown>;
  for (const field of REQUIRED_CAPTURE_STRINGS) {
    const v = cap[field];
    if (typeof v !== "string" || !v.trim()) {
      return { ok: false, error: `capture.${field} required` };
    }
  }

  if (!Array.isArray(body.memories)) {
    return { ok: false, error: "memories[] required" };
  }
  for (let i = 0; i < body.memories.length; i++) {
    const m = body.memories[i] as Record<string, unknown> | undefined;
    if (!m) return { ok: false, error: `memories[${i}] missing` };
    if (typeof m.content !== "string") {
      return { ok: false, error: `memories[${i}].content required` };
    }
    if (typeof m.chunk_id !== "string" || m.chunk_id.length !== 64) {
      return { ok: false, error: `memories[${i}].chunk_id must be a 64-char sha256 hex` };
    }
    if (!Array.isArray(m.embedding) || m.embedding.length !== EMBEDDER_DIM) {
      return {
        ok: false,
        error: `memories[${i}].embedding must be ${EMBEDDER_DIM}-dim`,
      };
    }
    if (typeof m.kind !== "string") {
      return { ok: false, error: `memories[${i}].kind required` };
    }
  }

  return { ok: true, bundle: body as BundleBody };
}

export type InsertResult = {
  capture_id: string;
  memory_ids: string[];
  deduped: boolean[];
};

export async function insertBundle(bundle: BundleBody, machineId: string): Promise<InsertResult> {
  return sql.begin(async (tx) => {
    const captureRows = await tx<{ id: string; created: boolean }[]>`
      INSERT INTO captures (
        content, content_sha256, source, machine_id, hostname,
        repo, harness, agent, session_id, topics, private, raw_meta
      )
      VALUES (
        ${bundle.capture.content}, ${bundle.capture.content_sha256},
        ${bundle.capture.source}, ${machineId}, ${bundle.capture.hostname},
        ${bundle.capture.repo}, ${bundle.capture.harness},
        ${bundle.capture.agent}, ${bundle.capture.session_id},
        ${bundle.capture.topics ?? []}, ${bundle.capture.private ?? false},
        ${sql.json((bundle.capture.raw_meta ?? {}) as never)}
      )
      ON CONFLICT (content_sha256, machine_id) DO UPDATE
      SET content = EXCLUDED.content
      RETURNING id, (xmax = 0) AS created
    `;
    const captureId = captureRows[0]!.id;

    const memoryIds: string[] = [];
    const deduped: boolean[] = [];

    for (const m of bundle.memories) {
      const vectorLiteral = `[${m.embedding.join(",")}]`;
      const memRows = await tx<{ id: string; created: boolean }[]>`
        INSERT INTO memories (
          capture_id, chunk_id, content, content_hash,
          embedding_model, embedding, tsv,
          kind, importance,
          machine_id, repo, harness, agent, topics, private,
          meta
        )
        VALUES (
          ${captureId}, ${m.chunk_id}, ${m.content}, ${m.content_hash},
          ${m.embedding_model}, ${vectorLiteral}::vector,
          to_tsvector('english', ${m.content}),
          ${m.kind}, ${m.importance},
          ${machineId}, ${bundle.capture.repo},
          ${bundle.capture.harness}, ${bundle.capture.agent},
          ${m.topics ?? []}, ${bundle.capture.private ?? false},
          ${sql.json((m.meta ?? {}) as never)}
        )
        ON CONFLICT (chunk_id) DO UPDATE
        SET meta = memories.meta || ${sql.json((m.meta ?? {}) as never)},
            importance = GREATEST(memories.importance, EXCLUDED.importance)
        RETURNING id, (xmax = 0) AS created
      `;
      memoryIds.push(memRows[0]!.id);
      deduped.push(!memRows[0]!.created);
    }

    // Side-effecting captures (pin / archive / supersede) actuate here,
    // inside the bundle transaction.
    await actuateRawMeta(tx, bundle.capture.raw_meta as Record<string, unknown> | undefined);

    return { capture_id: captureId, memory_ids: memoryIds, deduped };
  });
}

export function mountBundleRoute(app: Hono): void {
  app.post("/api/bundle", mnemeRoute("api.bundle"), requireAuth("capture"), async (c) => {
    const raw = await c.req.json().catch(() => null);
    const validation = validateBundleBody(raw);
    if (!validation.ok) {
      return c.json({ error: validation.error }, 400);
    }

    const auth = currentAuth();
    const machineId = auth?.machineId;
    if (!machineId) {
      return c.json({ error: "bundle requires per-machine token" }, 400);
    }

    const result = await insertBundle(validation.bundle, machineId);
    Logger.info("bundle inserted", {
      capture_id: result.capture_id,
      memory_count: result.memory_ids.length,
      deduped_count: result.deduped.filter(Boolean).length,
    });
    return c.json(result);
  });
}
