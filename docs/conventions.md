# Code conventions

The standard for all TypeScript/JavaScript in this repo. One model: **Biome-first, ESLint-thin.**

- **Biome owns formatting + linting.** Single Rust toolchain, fast, configured in [`biome.json`](../biome.json). Since Biome 2.0 it has type inference covering ~85% of what typescript-eslint catches, with none of the build-step cost.
- **ESLint owns only the blank-line padding** Biome structurally cannot express ([`eslint.config.js`](../eslint.config.js)). Nothing else. No type-aware rules, no stylistic duplication.

We do **not** run typescript-eslint type-aware linting (30× slower, needs a tsconfig build) or `eslint-plugin-react-hooks` — Biome's `useExhaustiveDependencies` and `useHookAtTopLevel` already cover React hooks.

---

## Formatting (Biome)

Matches the industry default shared by Prettier, Airbnb, and Google style guides:

| Setting | Value |
|---|---|
| Indent | 2 spaces |
| Line width | 100 |
| Quotes | double (JSX too) |
| Semicolons | always |
| Trailing commas | all (JS/TS), none (JSON) |
| Arrow parens | always |
| Line endings | LF |

Source of truth: `biome.json` → `formatter` + `javascript.formatter`. Don't restate values elsewhere.

## Linting (Biome)

`recommended` is **on**. A small set of rules is held at `warn` instead of `error` — pre-existing baseline debt, kept visible but non-blocking (ratchet pattern: fix incrementally, then promote back to `error`):

- `correctness/useExhaustiveDependencies` — React effect deps (was suppressed before)
- `suspicious/{useIterableCallbackReturn,noAssignInExpressions,noImplicitAnyLet,noArrayIndexKey}`
- `a11y/{noStaticElementInteractions,useFocusableInteractive,noLabelWithoutControl,useSemanticElements,useAriaPropsForRole,noSvgWithoutTitle}`

To silence one intentional case, use a Biome ignore comment (not ESLint):
`// biome-ignore lint/<group>/<rule>: <reason>`

## Blank-line padding (ESLint)

The one thing Biome can't do. Rule: `@stylistic/padding-line-between-statements`.

| Rule | Example |
|---|---|
| Blank line above every `return` | |
| Functions isolated by a blank line on both sides | |
| A `const`/`let`/`var` group is separated by a blank line from whatever follows | see below |
| Consecutive declarations stay grouped (no gap) | `const a = 1;`<br>`const b = 2;` |
| Every multi-line block (`if`/`for`/`while`/`try`/`switch`) isolated by blank lines | |

```ts
const traces = buffer.splice(0);
const spans = spanBuffer.splice(0);   // grouped, no gap

if (traces.length === 0) return;      // blank line after the const group

const text = await read();

Logger.warn("rejected", { count });   // blank line after const, before the call

try {
  flush();
} catch {
  // ignore
}

for (const c of fallbacks) {          // blocks isolated by blank lines
  if (exists(c)) return c;            // one-line guard inside a block is fine
}

throw new Error("not found");
```

A one-line statement (`if (x) return;`) is not a multi-line block, so it is not force-isolated — but a `const` before it still gets a blank line after the group.

## Naming

| Kind | Case | Example |
|---|---|---|
| Variables, functions | camelCase | `traceBuffer`, `flushOutbox` |
| Types, interfaces, classes, enums | PascalCase | `SupersedePair`, `DigestLimits` |
| True constants (module-level, fixed) | UPPER_SNAKE | `MAX_BATCH`, `DEFAULT_WINDOW` |
| Files | kebab-case | `trace-forwarder.ts` |

Imports used only as types use `import type { … }` (Biome `useImportType` autofixes this).

---

## How it's enforced

| Where | What runs |
|---|---|
| Pre-commit hook ([`.githooks/pre-commit`](../.githooks/pre-commit)) | `biome check --staged --write` then `eslint --fix` on staged JS/TS — both autofix-and-restage, neither blocks |
| Manual | `bun run check` (Biome format+lint), `bun run lint:style` (padding), `bun run lint:style:fix` |

Commands:

```bash
bun run format          # biome format --write .
bun run check           # biome check . (format + lint)
bun run lint:style      # eslint .       (padding rules)
bun run lint:style:fix  # eslint . --fix
```

## Sources

- [Biome](https://biomejs.dev/) · [Biome 2.0 type inference](https://biomejs.dev/blog/biome-v2/)
- [typescript-eslint configs](https://typescript-eslint.io/users/configs/) · [typed linting cost](https://typescript-eslint.io/getting-started/typed-linting/)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) · [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
