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
import { loadConfig } from "../core/config.ts";
import { callMnemeSql } from "../core/recall.ts";

export default function mneme(pi: ExtensionAPI) {
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
