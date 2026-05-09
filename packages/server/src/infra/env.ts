// Environment variable validation. Single source of truth for every
// `process.env.*` read in the server package. Parsed at import time;
// the app refuses to start with a clear error if anything is missing
// or malformed, instead of NaN-ing later.
//
// Pattern lifted from T3 stack (env.mjs). Add new envs here, type-checked
// everywhere via `import { env } from "./env.ts"`.

import { z } from "zod";

const Schema = z.object({
  // ── Postgres / Supabase ───────────────────────────────────────────
  DATABASE_URL: z.string().url(),
  MNEME_READER_DATABASE_URL: z.string().url(),
  // Supabase project keys are present in `.env` but currently unused by
  // the server runtime. Kept optional so they don't gate startup.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // ── Server ────────────────────────────────────────────────────────
  PORT: z.coerce.number().int().positive().default(3100),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // ── Auth ──────────────────────────────────────────────────────────
  // ADMIN_PASSWORD is read from process.env.ADMIN_PASSWORD inside
  // @mneme/core/auth.ts. Keep a copy in the schema so the validator
  // sees missing/empty cases at boot.
  ADMIN_PASSWORD: z.string().min(1),

  // Shared bearer used by Caddy upstream of Ollama/TEI. Specific
  // bearers below fall back to this when not set.
  AUTH_BEARER: z.string().optional(),

  // ── Local LLM (compute.jalipalo.dev → Ollama) ─────────────────────
  LLM_URL: z.string().url(),
  LLM_BEARER: z.string().optional(),
  LLM_MODEL: z.string().default("mneme-llm"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

  // ── OpenRouter (cloud LLM, primary path) ──────────────────────────
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_EXTRACT_MODEL: z
    .string()
    .default("qwen/qwen-2.5-72b-instruct"),
  OPENROUTER_DREAM_MODEL: z.string().default("anthropic/claude-sonnet-4"),
  OPENROUTER_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

  // ── Picker override ───────────────────────────────────────────────
  LLM_PROVIDER_FORCE: z
    .union([z.literal(""), z.literal("local"), z.literal("openrouter")])
    .default(""),

  // ── Worker toggles ────────────────────────────────────────────────
  // Boolean envs as "1" / "0" strings (Railway convention). Default
  // for ascend is "0" (off) — the worker is new (#30) and the operator
  // explicitly opts in by flipping this and restarting. Flip to "1"
  // when ready to let the weekly cluster-merge + cross-cluster
  // supersede pass run against the live corpus.
  MNEME_ASCEND_ENABLED: z.enum(["0", "1"]).default("0"),

  // ── Embedder (local TEI via compute.jalipalo.dev) ─────────────────
  EMBEDDER_PROVIDER: z.string().default("local"),
  EMBEDDER_URL: z.string().url().optional(),
  EMBEDDER_BEARER: z.string().optional(),
  EMBEDDER_MODEL: z.string().default("BAAI/bge-large-en-v1.5"),
  EMBEDDER_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
});

const parsed = (() => {
  const result = Schema.safeParse(process.env);
  if (!result.success) {
    const lines = result.error.errors.map(
      (e) => `  ${e.path.join(".")}: ${e.message}`,
    );
    console.error(
      `[env] invalid environment:\n${lines.join("\n")}\n` +
        `Fix the variables above (e.g. in .env or Railway Variables) and restart.`,
    );
    throw new Error("env: invalid environment");
  }
  return result.data;
})();

// Resolve fallback chains once so callers don't have to repeat them.
// LLM_BEARER falls back to AUTH_BEARER; embedder URL/bearer fall back
// to LLM equivalents (the homelab and inference VMs share the same
// Caddy and bearer in practice).
const LLM_BEARER_RESOLVED = parsed.LLM_BEARER ?? parsed.AUTH_BEARER ?? "";
const EMBEDDER_URL_RESOLVED = parsed.EMBEDDER_URL ?? parsed.LLM_URL;
const EMBEDDER_BEARER_RESOLVED =
  parsed.EMBEDDER_BEARER ??
  parsed.AUTH_BEARER ??
  parsed.LLM_BEARER ??
  "";

if (!LLM_BEARER_RESOLVED) {
  throw new Error("env: LLM_BEARER (or AUTH_BEARER) must be set");
}
if (!EMBEDDER_BEARER_RESOLVED) {
  throw new Error(
    "env: EMBEDDER_BEARER (or AUTH_BEARER, or LLM_BEARER) must be set",
  );
}

export const env = {
  ...parsed,
  // Resolved fallbacks (overrides the optional-typed originals)
  LLM_BEARER: LLM_BEARER_RESOLVED,
  EMBEDDER_URL: EMBEDDER_URL_RESOLVED,
  EMBEDDER_BEARER: EMBEDDER_BEARER_RESOLVED,
  // Derived flags for the picker
  HAS_OPENROUTER: !!parsed.OPENROUTER_API_KEY,
  IS_PRODUCTION: parsed.NODE_ENV === "production",
  // Worker toggles as bools (parsed from "0"/"1" strings)
  ASCEND_ENABLED: parsed.MNEME_ASCEND_ENABLED === "1",
} as const;

export type Env = typeof env;
