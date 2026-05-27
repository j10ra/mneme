// Daemon entry point. Wires:
//   - Hono app on 127.0.0.1:<daemon_port> (route handlers in routes/)
//   - The outbox at ~/.mneme/outbox/
//   - The configured agent provider (Claude via SDK with pathToClaude
//     CodeExecutable for OAuth inheritance)
//   - The subprocess-backed embedder around the runtime pipeline
//   - The local scheduler for time-driven jobs (dream, heartbeat,
//     embedder reap), persisted to ~/.mneme/schedule.json
//
// Configuration lives in ~/.mneme/config.json (written by the plugin
// install flow). The queue-driven worker tick (extract/embed/push of
// outbox files) stays as a tight setInterval since it's polling
// filesystem state, not a cron-shape job.

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Logger, configureLogger, configureTraceStore, getTraceStore, mnemeFn } from "@mneme/core";
import { Hono } from "hono";
import { pickAgent } from "./agents/index.ts";
import { type DreamDeps, resumeDreamCycles, runDreamCycle } from "./dream.ts";
import { createDreamOutbox } from "./dream-outbox.ts";
import { disposeIfIdle, embedBatch } from "./embed.ts";
import { createOutbox } from "./outbox.ts";
import { mountCaptureRoute } from "./routes/capture.ts";
import { mountDashboardRoutes } from "./routes/dashboard.ts";
import { mountDreamRoute } from "./routes/dream.ts";
import { mountEmbedRoute } from "./routes/embed.ts";
import { mountOpsRoutes } from "./routes/ops.ts";
import { type Bundle, createRuntime } from "./runtime.ts";
import { register, startScheduler } from "./scheduler.ts";
import { isNetworkOfflineError } from "./net.ts";
import { TraceForwarder } from "./trace-forwarder.ts";
import { withRootTrace } from "./tracing.ts";

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

const WORKER_TICK_MS = 2_000;

// Extract gates, priority: flush-ping > batch-full > idle > age-floor.
// Per-turn Stop events deliberately don't ping /flush so captures from
// many turns coalesce into one Haiku call with cross-turn context.
const EXTRACT_BATCH_FULL = 50;
const EXTRACT_IDLE_MS = 2 * 60_000;
const EXTRACT_FORCE_MS = 5 * 60_000;

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
      const err = new Error(`push failed ${response.status}: ${detail.slice(0, 300)}`);
      // 4xx are permanent (bad request, auth); 5xx and network are transient.
      if (response.status >= 400 && response.status < 500) {
        Object.assign(err, { permanent: true });
      }
      throw err;
    }
  };
}

export async function startDaemon(): Promise<void> {
  const config = await readConfig();
  const captureOutboxRoot = join(homedir(), ".mneme", "outbox", "capture");
  const dreamOutboxRoot = join(homedir(), ".mneme", "outbox", "dream");
  const outbox = createOutbox(captureOutboxRoot);
  const dreamOutbox = createDreamOutbox(dreamOutboxRoot);
  const agent = pickAgent(config.agent_provider);

  // Wire span forwarding to the server's /api/ingest/spans before any
  // mnemeFn / mnemeRoute fires, otherwise the first ticks lose their
  // traces.
  configureTraceStore(
    new TraceForwarder({
      serverUrl: config.server_url,
      token: config.token,
    }),
  );

  let lastProcessedAt: Date | null = null;
  const realPush = pushBundleViaServer(config.server_url, config.token);

  // Wrap external IO with mnemeFn so each call shows up as a child span
  // under whatever stage tick (or HTTP request) drove it. Useful for
  // queries like "extract latency over the last hour by machine" and
  // "push p95 to /api/bundle from each daemon".
  const tracedExtract = mnemeFn(
    "daemon.extract",
    async (captures: Parameters<typeof agent.extract>[0]["captures"]) =>
      agent.extract({ captures }),
  );
  const tracedEmbed = mnemeFn("daemon.embed", async (texts: string[]) => embedBatch(texts));
  const tracedPush = mnemeFn("daemon.push", async (bundle: Bundle) => {
    await realPush(bundle);
    lastProcessedAt = new Date();
  });

  const runtime = createRuntime({
    outbox,
    extract: tracedExtract,
    embed: tracedEmbed,
    push: tracedPush,
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

  const rehydrated = await outbox.rehydrateFailed();
  if (rehydrated > 0) {
    Logger.info("outbox: rehydrated failed captures", { count: rehydrated });
  }

  // ── HTTP listener ────────────────────────────────────────────────────
  // Single closure that the dream route + scheduler both call so the
  // manual /dream/run and the scheduled "dream" job share exactly the
  // same code path.
  const dreamDeps: DreamDeps = {
    serverUrl: config.server_url,
    token: config.token,
    machineId: config.machine_id,
    fetch: (u, init) => fetch(u, init),
    distill: (memories) => {
      if (!agent.distill) {
        throw new Error(`agent ${agent.name} does not support dream (no distill())`);
      }
      return agent.distill(memories);
    },
    embed: embedBatch,
    findSupersedes: agent.findSupersedes
      ? (candidates) => agent.findSupersedes!(candidates)
      : undefined,
    outbox: dreamOutbox,
  };
  const runDream = () => runDreamCycle(dreamDeps);
  // Forced cycle: a unique negative window_key (epoch millis, negated)
  // can never collide with a real 8h window (a small positive integer),
  // so acquireDreamLock always succeeds and the cycle always runs.
  // window_key is BIGINT, so the large negative value is in range.
  const forceDream = () => runDreamCycle({ ...dreamDeps, windowKey: -Date.now() });

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
  mountDashboardRoutes(app, forceDream);

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

  // ── Stage workers (independent, file-system synchronized) ───────────
  // Three ticks each on their own setInterval. While capture (extract)
  // is mid-Haiku-call (~3-5s on streaming SDK), embed and push keep
  // making progress on what's already in observations/ and embedded/.
  // Re-entry guard per tick — a long-running stage doesn't pile up
  // overlapping invocations of itself; it just no-ops on each
  // intermediate tick until the previous run releases.
  //
  // dedup + extract are kept sequential WITHIN the capture tick:
  // dedup must drain captured/ before extract reads it, otherwise
  // extract could pick up a file dedup is about to delete. embed and
  // push read different directories so they need no coordination
  // beyond the atomic POSIX renames the outbox already does.
  function makeTick(name: string, fn: () => Promise<void>): () => Promise<void> {
    let isTicking = false;
    const traceName = `daemon.${name}_tick`;
    return async () => {
      if (isTicking) return;
      isTicking = true;
      try {
        await withRootTrace(traceName, "daemon", fn);
      } catch (err) {
        Logger.error(`${name} tick crashed`, err);
      } finally {
        isTicking = false;
      }
    };
  }

  const captureTick = makeTick("capture", () => runtime.runCaptureTick());
  const embedTick = makeTick("embed", () => runtime.runEmbedTick());
  const pushTick = makeTick("push", () => runtime.runPushTick());

  setInterval(captureTick, WORKER_TICK_MS);
  setInterval(embedTick, WORKER_TICK_MS);
  setInterval(pushTick, WORKER_TICK_MS);

  // Drain any backlog from before boot immediately. Run them in
  // pipeline order (capture → embed → push) so files migrate forward
  // through stages on the very first tick.
  void (async () => {
    await captureTick();
    await embedTick();
    await pushTick();
  })();

  // ── Time-driven jobs (scheduler-managed; ~/.mneme/schedule.json) ─────
  // Heartbeat: outbox depth + last-processed-at posted to the server.
  // Best-effort: a missed heartbeat just means the server's "last seen"
  // for this daemon stays stale until the next tick. So we swallow
  // network-offline errors quietly here (sleep/wake, tunnel flap)
  // rather than letting them surface as scheduler ERRORs every minute.
  // Genuine HTTP failures (500, auth) still throw and the scheduler
  // logs them.
  const postHeartbeat = async (): Promise<void> => {
    const [captured, observations, embedded, failed] = await Promise.all([
      outbox.list("captured"),
      outbox.list("observations"),
      outbox.list("embedded"),
      outbox.list("failed"),
    ]);
    let response: Response;
    try {
      // Legacy wire-shape field names; kept for older server compat.
      response = await fetch(`${config.server_url}/api/heartbeat`, {
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
    } catch (err) {
      if (isNetworkOfflineError(err)) {
        Logger.debug("heartbeat: skipped (offline)", {
          error: err instanceof Error ? err.message : String(err),
        });
        return;
      }
      throw err;
    }
    if (!response.ok) {
      throw new Error(`heartbeat ${response.status}`);
    }
  };

  register({
    name: "dream",
    scheduleMs: DREAM_SCHEDULE_MS,
    run: () => withRootTrace("daemon.dream", "daemon", runDream).then(() => undefined),
  });
  register({
    name: "heartbeat",
    scheduleMs: HEARTBEAT_SCHEDULE_MS,
    run: () => withRootTrace("daemon.heartbeat", "daemon", postHeartbeat),
  });
  register({
    name: "embedder-reap",
    scheduleMs: EMBEDDER_REAP_SCHEDULE_MS,
    run: () => disposeIfIdle().then(() => undefined),
  });
  await startScheduler();

  // Flush in-flight spans on shutdown so the operator sees the trail
  // when launchctl yanks the daemon. Best-effort; failures don't block.
  const shutdown = async (signal: string): Promise<void> => {
    Logger.info(`daemon ${signal} — flushing traces`);
    try {
      await getTraceStore()?.stop();
    } catch (err) {
      Logger.warn("trace flush on shutdown failed", err);
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
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
