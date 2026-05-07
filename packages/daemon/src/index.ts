// Daemon entry point. Wires Bun.serve, the outbox at ~/.mneme/outbox/,
// the configured agent provider, and the in-process embedder around the
// pure pipeline in runtime.ts.
//
// Configuration lives in ~/.mneme/config.json (written by the plugin
// install flow): server_url, machine_id, token, daemon_port,
// agent_provider. The daemon polls config mtime each tick and reloads
// changes (no restart needed when the user runs `mneme agent set <name>`).
//
// Worker tick runs every 2 seconds while idle; an fs.watch on
// outbox/pending/ kicks an immediate tick whenever the hook drops a new
// file so capture-to-extract latency stays sub-second.

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pickAgent } from "./agents/index.ts";
import { runDreamCycle } from "./dream.ts";
import { embedBatch } from "./embed.ts";
import { createOutbox } from "./outbox.ts";
import { type Bundle, createRuntime } from "./runtime.ts";

export type DaemonConfig = {
  server_url: string;
  machine_id: string;
  token: string;
  daemon_port: number;
  agent_provider: string;
};

const DEFAULT_TICK_MS = 2_000;
const DREAM_TICK_MS = 60 * 60 * 1000; // try every hour; lock dedups to one win per 8h window

async function readConfig(): Promise<DaemonConfig> {
  const path = join(homedir(), ".mneme", "config.json");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as DaemonConfig;
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

export async function startDaemon(): Promise<void> {
  const config = await readConfig();
  const outboxRoot = join(homedir(), ".mneme", "outbox");
  const outbox = createOutbox(outboxRoot);
  const agent = pickAgent(config.agent_provider);

  const runtime = createRuntime({
    outbox,
    extract: (captures) => agent.extract({ captures }),
    embed: embedBatch,
    push: pushBundleViaServer(config.server_url, config.token),
  });

  // HTTP listener: hook posts captures here.
  Bun.serve({
    port: config.daemon_port,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);
      if (req.method === "POST" && url.pathname === "/capture") {
        const body = await req.json().catch(() => null);
        if (!body) return new Response("invalid json", { status: 400 });
        const result = await runtime.handleCapture(body as never);
        if (!result.ok) {
          return new Response(JSON.stringify({ error: result.error }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ id: result.id }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (req.method === "GET" && url.pathname === "/health") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    },
  });

  // Worker tick loop. Per-tick errors don't crash the loop; runtime
  // already logs and leaves files in their last-completed state.
  const tick = async () => {
    try {
      await runtime.runWorkerTick();
    } catch (err) {
      console.error("worker tick crashed:", err);
    }
  };
  setInterval(tick, DEFAULT_TICK_MS);
  // Kick once on boot so any backlog from before daemon start drains
  // immediately rather than waiting up to DEFAULT_TICK_MS.
  void tick();

  // Dream loop: hourly attempt, the server-side advisory-claim ledger
  // ensures only one daemon per 8h window actually runs. A cron offset
  // derived from machine_id staggers attempts so all daemons don't pile
  // on the lock at the same minute.
  const dreamTick = async () => {
    try {
      const result = await runDreamCycle({
        serverUrl: config.server_url,
        token: config.token,
        machineId: config.machine_id,
        fetch: (url, init) => fetch(url, init),
        distill: (memories) => {
          if (!agent.distill) {
            throw new Error(
              `agent ${agent.name} does not support dream (no distill())`,
            );
          }
          return agent.distill(memories);
        },
      });
      if (!result.skipped) {
        console.log(
          `dream cycle complete: ${result.clustersWritten ?? 0} clusters written`,
        );
      }
    } catch (err) {
      console.error("dream cycle crashed:", err);
    }
  };
  setInterval(dreamTick, DREAM_TICK_MS);
  // Don't auto-fire on boot; the first scheduled tick gives the daemon
  // a chance to drain any pending captures before competing for the
  // dream lock.
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
