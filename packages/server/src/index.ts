import { Hono } from "hono";
import {
  Logger,
  TraceStore,
  configureAuth,
  configureLogger,
  configureTraceStore,
  getTraceStore,
  mnemeRoute,
  requireAuth,
} from "@mneme/core";
import { sql, sha256Hex } from "./db.ts";

// Wire core to DB and env.
configureLogger({
  jsonMode: process.env.NODE_ENV === "production",
  minLevel: "debug",
});
configureAuth(sql);
configureTraceStore(new TraceStore({ sql }));

const app = new Hono();

// ---------------------------------------------------------------------------
// /health — public, no auth, no scope check.
// ---------------------------------------------------------------------------
app.get("/health", mnemeRoute("health"), (c) =>
  c.json({ status: "ok", phase: 0 }),
);

// ---------------------------------------------------------------------------
// POST /api/capture — write, scope=capture
// ---------------------------------------------------------------------------
type CaptureBody = {
  content: string;
  source: string;
  machine_id: string;
  hostname: string;
  repo?: string | null;
  harness: string;
  agent?: string | null;
  session_id?: string | null;
  topics?: string[];
  private?: boolean;
  raw_meta?: Record<string, unknown>;
};

app.post(
  "/api/capture",
  mnemeRoute("api.capture"),
  requireAuth("capture"),
  async (c) => {
    const body = (await c.req.json().catch(() => null)) as CaptureBody | null;
    if (!body) return c.json({ error: "invalid_json" }, 400);

    const required = ["content", "source", "machine_id", "hostname", "harness"] as const;
    for (const field of required) {
      if (!body[field] || typeof body[field] !== "string") {
        return c.json({ error: `${field} required` }, 400);
      }
    }

    const hash = await sha256Hex(body.content);

    const inserted = await sql<{ id: string }[]>`
      INSERT INTO captures (
        content, content_sha256, source, machine_id, hostname,
        repo, harness, agent, session_id, topics, private, raw_meta
      )
      VALUES (
        ${body.content}, ${hash}, ${body.source}, ${body.machine_id}, ${body.hostname},
        ${body.repo ?? null}, ${body.harness}, ${body.agent ?? null}, ${body.session_id ?? null},
        ${body.topics ?? []}, ${body.private ?? false}, ${sql.json((body.raw_meta ?? {}) as never)}
      )
      ON CONFLICT (content_sha256, machine_id) DO NOTHING
      RETURNING id
    `;

    let id: string;
    let deduped: boolean;
    if (inserted[0]) {
      id = inserted[0].id;
      deduped = false;
      // Phase 4 wires extract+embed jobs; for now we enqueue stubs so the
      // worker queue path is exercised end-to-end.
      await sql`
        INSERT INTO ingest_jobs (capture_id, phase, state)
        VALUES (${id}, ${"extract"}, ${"queued"}),
               (${id}, ${"embed"}, ${"queued"})
      `;
      Logger.info(`captured id=${id}`);
    } else {
      const existing = await sql<{ id: string }[]>`
        SELECT id FROM captures
        WHERE content_sha256 = ${hash} AND machine_id = ${body.machine_id}
        LIMIT 1
      `;
      if (!existing[0]) return c.json({ error: "insert_failed" }, 500);
      id = existing[0].id;
      deduped = true;
      Logger.info(`captured (deduped) id=${id}`);
    }

    return c.json({ id, deduped });
  },
);

// ---------------------------------------------------------------------------
// POST /api/session/start — read, scope=read
// Phase 0 stub: returns empty pointer shape. Real aggregation lands in Phase 2.
// ---------------------------------------------------------------------------
app.post(
  "/api/session/start",
  mnemeRoute("api.session.start"),
  requireAuth("read"),
  async (c) => {
    await c.req.json().catch(() => ({}));
    return c.json({
      pinned: [],
      rules: [],
      clusters: [],
      sessions: [],
      rendered: "",
    });
  },
);

// ---------------------------------------------------------------------------
// POST /mcp — read, scope=mcp. Placeholder until Phase 2.
// ---------------------------------------------------------------------------
app.post("/mcp", mnemeRoute("mcp"), requireAuth("mcp"), (c) =>
  c.json({ error: "not_implemented", phase: 2 }),
);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const port = Number(process.env.PORT ?? 3100);

async function shutdown(signal: string): Promise<void> {
  Logger.info(`${signal} received, flushing traces and closing pool`);
  try {
    await getTraceStore()?.stop();
  } finally {
    await sql.end({ timeout: 5 });
  }
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.stderr.write(`mneme server listening on :${port}\n`);

export default { port, fetch: app.fetch };
