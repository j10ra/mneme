// Daemon entry point. Wires:
//   - Hono app on 127.0.0.1:<daemon_port> (route handlers in routes/)
//   - The outbox at ~/.mneme/outbox/
//   - The configured agent provider (Claude via SDK with pathToClaude
//     CodeExecutable for OAuth inheritance)
//   - The in-process embedder around the runtime pipeline
//   - The local scheduler for time-driven jobs (dream, heartbeat,
//     embedder reap), persisted to ~/.mneme/schedule.json
//
// Configuration lives in ~/.mneme/config.json (written by the plugin
// install flow). The queue-driven worker tick (extract/embed/push of
// outbox files) stays as a tight setInterval since it's polling
// filesystem state, not a cron-shape job.

import { mkdir, readFile, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Logger, configureLogger } from "@mneme/core";
import { Hono } from "hono";
import { pickAgent } from "./agents/index.ts";
import { resumeDreamCycles, runDreamCycle } from "./dream.ts";
import { createDreamOutbox } from "./dream-outbox.ts";
import { disposeIfIdle, embedBatch } from "./embed.ts";
import { createOutbox } from "./outbox.ts";
import { mountCaptureRoute } from "./routes/capture.ts";
import { mountDreamRoute } from "./routes/dream.ts";
import { mountEmbedRoute } from "./routes/embed.ts";
import { mountOpsRoutes } from "./routes/ops.ts";
import { type Bundle, createRuntime } from "./runtime.ts";
import { register, startScheduler } from "./scheduler.ts";

export type DaemonConfig = {
  server_url: string;
  machine_id: string;
  token: string;
  daemon_port: number;
  agent_provider: string;
};

// Schema written by the plugin's setup flow (packages/plugin/scripts/
// config.ts MnemeConfig). The daemon flattens it into the local shape.
type PluginShapedConfig = {
  server: { url: string };
  auth: { key: string };
  machine: { id: string };
  daemon?: { port: number; agent_provider: string };
};

// Worker tick is queue-driven (polls outbox files), so it stays as a
// plain setInterval rather than going through the scheduler.
const WORKER_TICK_MS = 2_000;

// Extract gating. Triggers in priority:
//   1. /flush ping  - PreCompact, SessionEnd (natural session boundaries)
//   2. group hits EXTRACT_BATCH_FULL - runaway protection on long sessions
//      with no real pauses
//   3. group idle EXTRACT_IDLE_MS - "user took a break" detector
//   4. oldest pending older than EXTRACT_FORCE_MS - latency floor; ensures
//      /recall freshness even on sessions that never pause and never
//      reach the runaway cap (rare but worth covering)
// Per-turn Stop events no longer flush, so captures from many turns
// coalesce into one Haiku call with richer cross-turn context.
const EXTRACT_BATCH_FULL = 50;
const EXTRACT_IDLE_MS = 2 * 60_000;
const EXTRACT_FORCE_MS = 5 * 60_000;

// Scheduler intervals for time-driven jobs.
const DREAM_SCHEDULE_MS = 8 * 3600_000;
const HEARTBEAT_SCHEDULE_MS = 60_000;
const EMBEDDER_REAP_SCHEDULE_MS = 60_000;

async function readConfig(): Promise<DaemonConfig> {
  const path = join(homedir(), ".mneme", "config.json");
  const raw = await readFile(path, "utf8");
  const shaped = JSON.parse(raw) as PluginShapedConfig;
  if (!shaped.daemon) {
    throw new Error(
      "config.json has no `daemon` section; run /mneme:setup to install the daemon service",
    );
  }
  return {
    server_url: shaped.server.url.replace(/\/$/, ""),
    machine_id: shaped.machine.id,
    token: shaped.auth.key,
    daemon_port: shaped.daemon.port,
    agent_provider: shaped.daemon.agent_provider,
  };
}

function pushBundleViaServer(serverUrl: string, token: string) {
  return async (bundle: Bundle): Promise<void> => {
    const response = await fetch(`${serverUrl}/api/bundle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bundle),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const err = new Error(
        `push failed ${response.status}: ${detail.slice(0, 300)}`,
      );
      // 4xx are permanent (bad request, auth); 5xx and network are transient.
      if (response.status >= 400 && response.status < 500) {
        Object.assign(err, { permanent: true });
      }
      throw err;
    }
  };
}

// One-time migration from the pre-restructure layout
// (~/.mneme/outbox/{pending,extracted,embedded,failed}) to the new
// layout under outbox/capture/. Runs on every startup but no-ops once
// the move has been done.
async function migrateLegacyCaptureOutbox(): Promise<void> {
  const root = join(homedir(), ".mneme", "outbox");
  const captureRoot = join(root, "capture");
  if (existsSync(captureRoot)) return; // already migrated

  const stages = ["pending", "extracted", "embedded", "failed"] as const;
  const present = stages.filter((s) => existsSync(join(root, s)));
  if (present.length === 0) return; // fresh daemon, nothing to migrate

  Logger.info("outbox: migrating legacy capture layout", { stages: present });
  await mkdir(captureRoot, { recursive: true });
  for (const s of present) {
    await rename(join(root, s), join(captureRoot, s));
  }
}

// One-shot cleanup of the now-defunct outbox/plugin/ namespace. The
// plugin no longer keeps its own fallback queue; the hook writes
// directly into outbox/capture/pending/ when the daemon is briefly
// unreachable. Any pre-existing files there are stranded captures
// from older plugin versions; move them into capture/pending/ so the
// daemon picks them up, then remove the empty plugin/ dir.
async function reclaimLegacyPluginOutbox(): Promise<void> {
  const root = join(homedir(), ".mneme", "outbox");
  const pluginDir = join(root, "plugin");
  if (!existsSync(pluginDir)) return;
  let entries: string[];
  try {
    entries = await readdir(pluginDir);
  } catch {
    return;
  }
  const stranded = entries.filter((e) => e.endsWith(".json"));
  const captureDir = join(root, "capture", "pending");
  await mkdir(captureDir, { recursive: true });
  for (const f of stranded) {
    const id = `${Date.now()}-${f.slice(0, 8)}.json`;
    await rename(join(pluginDir, f), join(captureDir, id));
  }
  if (stranded.length > 0) {
    Logger.info("outbox: reclaimed stranded plugin captures into pending/", {
      count: stranded.length,
    });
  }
  // rmdir is best-effort; only succeeds if dir is empty.
  try {
    const { rmdir } = await import("node:fs/promises");
    await rmdir(pluginDir);
  } catch {
    // not empty (unexpected file types) - leave it alone
  }
}

export async function startDaemon(): Promise<void> {
  const config = await readConfig();
  await migrateLegacyCaptureOutbox();
  await reclaimLegacyPluginOutbox();
  const captureOutboxRoot = join(homedir(), ".mneme", "outbox", "capture");
  const dreamOutboxRoot = join(homedir(), ".mneme", "outbox", "dream");
  const outbox = createOutbox(captureOutboxRoot);
  const dreamOutbox = createDreamOutbox(dreamOutboxRoot);
  const agent = pickAgent(config.agent_provider);

  let lastProcessedAt: Date | null = null;
  const realPush = pushBundleViaServer(config.server_url, config.token);

  const runtime = createRuntime({
    outbox,
    extract: (captures) => agent.extract({ captures }),
    embed: embedBatch,
    push: async (bundle) => {
      await realPush(bundle);
      lastProcessedAt = new Date();
    },
    extractBatchFull: EXTRACT_BATCH_FULL,
    extractIdleMs: EXTRACT_IDLE_MS,
    extractForceMs: EXTRACT_FORCE_MS,
  });

  configureLogger({ jsonMode: false, minLevel: "debug" });
  Logger.info("daemon starting", {
    machine_id: config.machine_id,
    agent: config.agent_provider,
    capture_outbox: captureOutboxRoot,
    dream_outbox: dreamOutboxRoot,
    server: config.server_url,
  });

  // ── HTTP listener ────────────────────────────────────────────────────
  // Single closure that the dream route + scheduler both call so the
  // manual /dream/run and the scheduled "dream" job share exactly the
  // same code path.
  const runDream = () =>
    runDreamCycle({
      serverUrl: config.server_url,
      token: config.token,
      machineId: config.machine_id,
      fetch: (u, init) => fetch(u, init),
      distill: (memories) => {
        if (!agent.distill) {
          throw new Error(
            `agent ${agent.name} does not support dream (no distill())`,
          );
        }
        return agent.distill(memories);
      },
      embed: embedBatch,
      findSupersedes: agent.findSupersedes
        ? (candidates) => agent.findSupersedes!(candidates)
        : undefined,
      outbox: dreamOutbox,
    });

  // Resume any unfinished dream cycles persisted on disk before doing
  // anything else. A daemon crash mid-cycle leaves Sonnet output in
  // outbox/dream/<window>/distilled/ or embedded/; resumeDreamCycles
  // re-embeds + re-submits without re-paying tokens.
  try {
    const resumed = await resumeDreamCycles({
      serverUrl: config.server_url,
      token: config.token,
      machineId: config.machine_id,
      fetch: (u, init) => fetch(u, init),
      embed: embedBatch,
      outbox: dreamOutbox,
    });
    if (resumed.resumed > 0) {
      Logger.info("daemon: dream resume complete", resumed);
    }
  } catch (err) {
    Logger.error("daemon: dream resume crashed", err);
  }

  const app = new Hono();
  mountOpsRoutes(app, runtime);
  mountCaptureRoute(app, runtime);
  mountEmbedRoute(app);
  mountDreamRoute(app, runDream);

  Bun.serve({
    port: config.daemon_port,
    hostname: "127.0.0.1",
    fetch: app.fetch,
    // Manual /dream/run can take minutes (one Sonnet call per cluster
    // plus the optional supersede pass). Bun's default 10s idleTimeout
    // would close the connection long before runDream returns. 0 =
    // no timeout, since this listener is bound to 127.0.0.1 and only
    // serves trusted local callers.
    idleTimeout: 0,
  });
  Logger.info("daemon listening", {
    url: `http://127.0.0.1:${config.daemon_port}`,
  });

  // ── Worker tick (queue-driven; outbox file scanner) ──────────────────
  let isTicking = false;
  const tick = async () => {
    if (isTicking) return;
    isTicking = true;
    try {
      await runtime.runWorkerTick();
    } catch (err) {
      Logger.error("worker tick crashed", err);
    } finally {
      isTicking = false;
    }
  };
  setInterval(tick, WORKER_TICK_MS);
  void tick(); // drain any backlog from before boot immediately

  // ── Time-driven jobs (scheduler-managed; ~/.mneme/schedule.json) ─────
  // Heartbeat: outbox depth + last-processed-at posted to the server.
  const postHeartbeat = async (): Promise<void> => {
    const [captured, observations, embedded, failed] = await Promise.all([
      outbox.list("captured"),
      outbox.list("observations"),
      outbox.list("embedded"),
      outbox.list("failed"),
    ]);
    // Server's heartbeat API still uses the legacy field names so older
    // server versions stay compatible. The mapping is just a rename.
    const response = await fetch(`${config.server_url}/api/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({
        outbox_pending: captured.length,
        outbox_extracted: observations.length,
        outbox_embedded: embedded.length,
        outbox_failed: failed.length,
        last_processed_at: lastProcessedAt?.toISOString() ?? null,
      }),
    });
    if (!response.ok) {
      throw new Error(`heartbeat ${response.status}`);
    }
  };

  register({
    name: "dream",
    scheduleMs: DREAM_SCHEDULE_MS,
    run: runDream,
  });
  register({
    name: "heartbeat",
    scheduleMs: HEARTBEAT_SCHEDULE_MS,
    run: postHeartbeat,
  });
  register({
    name: "embedder-reap",
    scheduleMs: EMBEDDER_REAP_SCHEDULE_MS,
    run: () => disposeIfIdle().then(() => undefined),
  });
  await startScheduler();
}

// When invoked directly (`bun run src/index.ts`), start the daemon.
// When imported by tests, the caller drives startDaemon manually.
if (import.meta.main) {
  await startDaemon();
}

export { listAgents, pickAgent } from "./agents/index.ts";
export type {
  AgentProvider,
  AvailabilityStatus,
  Capture,
  DreamOutput,
  ExtractedMemory,
  Memory,
} from "./agents/types.ts";
