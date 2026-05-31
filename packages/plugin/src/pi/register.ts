// @ts-nocheck — compiled by Pi's toolchain (which supplies @earendil-works/*
// and typebox), not by this repo's tsc. Kept outside tsconfig include globs.
//
// Pi coding-agent extension — the Pi-side analog of the Claude Code
// plugin's .mcp.json. Declared in the repo-root package.json under
// `pi.extensions`, so `pi install git:github.com/j10ra/mneme` auto-wires
// `mneme_sql` as a native tool with no manual config and no pi-mcp adapter.
//
// Recall logic is NOT duplicated here: it reuses the shared core in
// ../core/recall.ts, the same module the Claude Code stdio proxy
// uses. This file is the harness adapter; the core is harness-neutral.
//
// Pi loads this under its own toolchain (it provides @earendil-works/* and
// typebox), so it lives outside mneme's tsconfig include globs and is not
// part of `bun run typecheck`.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { isBlacklistedPath, loadConfig } from "../core/config.ts";
import { callMnemeSql } from "../core/recall.ts";
import { discoverRepos } from "../core/scope.ts";
import {
  fetchSurface,
  renderSurfaceForLLM,
  summariseSurfaceForUser,
  utf8Bytes,
} from "../core/surface.ts";
import { formatCurrentTime } from "../core/time.ts";

export default function mneme(pi: ExtensionAPI) {
  // NOTE: Pi intentionally does NOT self-heal the daemon (no refreshDaemonIfStale
  // analog). The daemon is one-per-machine and Claude-owned (it runs from the
  // Claude plugin cache); Claude Code is the first-class harness for daemon
  // lifecycle. A Pi-only machine refreshes it via Claude or /mneme:setup. Don't
  // add daemon self-heal here — that divergence is deliberate.
  //
  // Read-path PUSH: on session start, hand the agent its relevance-ranked
  // memory corpus — the Pi analog of Claude Code's SessionStart surface
  // injection (src/claude/hook.ts). Uses the same harness-neutral fetchSurface
  // + renderers, so the surface is identical across harnesses.
  //
  // Two channels, same split as the Claude hook (additionalContext vs
  // systemMessage), expressed via the custom-message `display` flag:
  //   - FULL surface → display:false: the model reads it, the user doesn't see
  //     the raw dump.
  //   - COMPACT banner → display:true: the user sees repo/machines/since-last
  //     counts in the transcript.
  // Both use triggerTurn:false so they land as background context without
  // kicking off an agent turn. Fail-open: a surface miss must never block the
  // session.
  pi.on("session_start", async (event, ctx) => {
    const cwd = ctx?.cwd;

    if (!cwd || isBlacklistedPath(cwd)) return;

    let cfg: ReturnType<typeof loadConfig>;

    try {
      cfg = loadConfig();
    } catch {
      return; // not configured on this machine — nothing to surface
    }

    try {
      const repos = discoverRepos(cwd);
      const sessionId = ctx?.sessionManager?.getSessionId?.() ?? null;
      const surface = await fetchSurface(cfg, { repos, sessionId, source: "pi" });

      if (!surface) return;

      const fullForLlm = renderSurfaceForLLM(surface);
      const banner = summariseSurfaceForUser(surface, utf8Bytes(fullForLlm));

      // Model-only: the full surface, injected into the next turn's context
      // (deliverAs:"nextTurn") and hidden from the transcript (display:false).
      await pi.sendMessage(
        { customType: "mneme_surface", content: fullForLlm, display: false },
        { triggerTurn: false, deliverAs: "nextTurn" },
      );
      // User-facing: the compact banner, shown in the transcript — but only on
      // fresh starts (the Claude hook shows its banner on startup|clear; here
      // startup|new). resume/reload/fork are mid-flow, so stay quiet.
      const reason = event?.reason;

      if (reason === "startup" || reason === "new") {
        await pi.sendMessage(
          { customType: "mneme", content: banner, display: true },
          { triggerTurn: false },
        );
      }
    } catch {
      // best-effort; the recall tool still works without the surface push.
    }
  });

  // Per-turn wall-clock time: ground the agent's "now" on every user input so a
  // long session never reasons against a stale session-start date. The Pi
  // analog of the Claude hook's UserPromptSubmit time injection. Model-only
  // (display:false) and attached to the imminent turn (deliverAs:"nextTurn").
  pi.on("input", async (event, ctx) => {
    if (event?.source !== "interactive") return;
    if (!ctx?.cwd || isBlacklistedPath(ctx.cwd)) return;

    try {
      await pi.sendMessage(
        {
          customType: "mneme_time",
          content: `Current time: ${formatCurrentTime()}`,
          display: false,
        },
        { triggerTurn: false, deliverAs: "nextTurn" },
      );
    } catch {
      // best-effort; never block the turn.
    }
  });

  pi.registerTool({
    name: "mneme_sql",
    label: "Mneme: recall",
    description:
      "Execute a read-only SELECT against Mneme's cross-machine Postgres memory. " +
      "Use embed('text') for semantic search (substituted with a 384-dim vector before execution). " +
      "Combine with `<=>` for cosine distance and ts_rank(tsv, websearch_to_tsquery(...)) for keyword. " +
      "Auto-LIMIT 50 if absent. See the using-mneme skill for the schema and query templates.",
    promptSnippet:
      "Recall cross-machine memory via read-only SQL; embed('text') does semantic search.",
    parameters: Type.Object({
      query: Type.String({ description: "SQL SELECT statement" }),
    }),
    execute: async (_toolCallId, params: { query: string }) => {
      let cfg: ReturnType<typeof loadConfig>;

      try {
        cfg = loadConfig();
      } catch (e) {
        throw new Error(
          `Mneme is not configured on this machine (${e instanceof Error ? e.message : String(e)}). ` +
            "Register it first (e.g. via Claude Code's /mneme:setup) so ~/.mneme/config.json exists.",
        );
      }

      const text = await callMnemeSql(cfg, params.query);

      return { content: [{ type: "text" as const, text }], details: undefined };
    },
  });
}
