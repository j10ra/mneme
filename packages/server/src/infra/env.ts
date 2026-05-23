// Environment variable validation. Single source of truth for every
// `process.env.*` read in the server package. Parsed at import time;
// the app refuses to start with a clear error if anything is missing
// or malformed, instead of NaN-ing later.
//
// Pattern lifted from T3 stack (env.mjs). Add new envs here, type-checked
// everywhere via `import { env } from "./env.ts"`.

import { z } from "zod";

const Schema = z.object({
  // ── Postgres ──────────────────────────────────────────────────────
  DATABASE_URL: z.string().url(),
  MNEME_READER_DATABASE_URL: z.string().url(),

  // ── Server ────────────────────────────────────────────────────────
  PORT: z.coerce.number().int().positive().default(3100),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // ── Auth ──────────────────────────────────────────────────────────
  // ADMIN_PASSWORD is read from process.env.ADMIN_PASSWORD inside
  // @mneme/core/auth.ts. Keep a copy in the schema so the validator
  // sees missing/empty cases at boot.
  ADMIN_PASSWORD: z.string().min(1),

  // ── OpenRouter (the only server-side LLM path) ────────────────────
  // Digest runs its two cross-cluster judgments (findSupersedes for Op2,
  // judgeClusterMerge for Op1) against OpenRouter. When OPENROUTER_API_KEY
  // is unset or the breaker opens, digest skips. No other server-side LLM
  // provider exists — extract and distill moved to the per-machine daemon
  // entirely in 1.1.63.
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_DIGEST_MODEL: z.string().default("anthropic/claude-sonnet-4"),
  OPENROUTER_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

  // ── Worker toggles ────────────────────────────────────────────────
  // Boolean envs as "1" / "0" strings (Railway convention). Default
  // for digest is "0" (off) — the worker is new (#30) and the operator
  // explicitly opts in by flipping this and restarting. Flip to "1"
  // when ready to let the every-48h cluster-merge + cross-cluster
  // supersede pass run against the live corpus.
  MNEME_DIGEST_ENABLED: z.enum(["0", "1"]).default("0"),

  // ── Recall LTP (use-driven reinforcement, #37) ────────────────────
  // Tunable at runtime so coefficients can be adjusted from a few weeks
  // of access data without a redeploy. Defaults match the ticket's
  // brainstormed values; everything else (nap, dream, supersede)
  // remains plain constants in config.ts because those rarely change.
  RECALL_LTP_FULL: z.coerce.number().default(1.0),
  RECALL_LTP_PARTIAL: z.coerce.number().default(0.4),
  RECALL_LTP_PARTIAL_ROW_CAP: z.coerce.number().int().positive().default(10),
  RECALL_LTD_DECAY: z.coerce.number().min(0).max(1).default(0.933),
  RECALL_RANKING_COEF: z.coerce.number().default(0.1),

  // ── Embedder ──────────────────────────────────────────────────────
  // No embedder env vars on the server. The per-machine daemon owns the
  // embedder identity and stamps `embedding_model` on every write the
  // server receives. EMBEDDER_DIM (vector column shape) lives as a
  // constant in infra/config.ts because it's tied to the DB schema.
});

const parsed = (() => {
  const result = Schema.safeParse(process.env);
  if (!result.success) {
    const lines = result.error.errors.map((e) => `  ${e.path.join(".")}: ${e.message}`);
    console.error(
      `[env] invalid environment:\n${lines.join("\n")}\n` +
        `Fix the variables above (e.g. in .env or Railway Variables) and restart.`,
    );
    throw new Error("env: invalid environment");
  }
  return result.data;
})();

export const env = {
  ...parsed,
  // Derived flags
  HAS_OPENROUTER: !!parsed.OPENROUTER_API_KEY,
  IS_PRODUCTION: parsed.NODE_ENV === "production",
  // Worker toggles as bools (parsed from "0"/"1" strings)
  DIGEST_ENABLED: parsed.MNEME_DIGEST_ENABLED === "1",
} as const;

export type Env = typeof env;
