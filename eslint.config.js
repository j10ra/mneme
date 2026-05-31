// Thin ESLint layer. Biome owns formatting + linting (see biome.json).
// This config exists ONLY for blank-line padding rules Biome cannot express.
// Do not add type-aware or stylistic rules here that Biome already covers.

import stylistic from "@stylistic/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.bun/**",
      "**/.claude/**",
      "**/*.min.js",
      "**/bundle.js",
      "packages/plugin/dashboard/dist/**",
      "packages/plugin/src/core/scrub.ts",
      "packages/plugin/embed-worker.js",
      "packages/plugin/daemon.js",
      "migrations/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,mjs,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { "@stylistic": stylistic },
    rules: {
      "@stylistic/padding-line-between-statements": [
        "error",
        // blank line required above every return
        { blankLine: "always", prev: "*", next: "return" },
        // functions isolated by a blank line on both sides
        { blankLine: "always", prev: "*", next: "function" },
        { blankLine: "always", prev: "function", next: "*" },
        // const/let/var group must be separated from a following multi-line block
        // (a const followed by a single-line statement stays allowed)
        { blankLine: "always", prev: ["const", "let", "var"], next: "multiline-block-like" },
        // consecutive declarations may stay grouped with no gap
        { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
      ],
    },
  },
];
