# Finder angles

Load when: doing a non-trivial PR review (>50 lines or any logic change). Skip for one-line typo/comment fixes.

Recall is the goal — catching a real bug matters more than avoiding false positives. Run angles **independently**; don't let one angle's conclusion suppress another. If two angles flag the same line for different reasons, record both and let dedup happen at the verify step.

For large diffs (>300 lines), dispatch each angle as its own `Agent` (subagent_type=general-purpose) in parallel — same message, multiple tool calls. For small diffs, run sequentially in your own context.

---

## A · Line-by-line diff scan

Read every hunk line by line, then Read the enclosing function. For each changed line ask: what input, state, timing, or platform makes this wrong?

Watch for:
- inverted/wrong conditions, off-by-one
- null/undefined deref, missing `await`
- falsy-zero check (JS), `==` coercion
- wrong-variable copy-paste
- error swallowed in catch
- unescaped regex metachars
- string interpolation into SQL/HTML/shell

## B · Removed-behavior auditor

For every line the diff DELETES or replaces, name the invariant or behavior it enforced. Then search the new code for where that invariant is re-established. If you can't find it, that's a candidate:

- removed guard (`if (!auth) return 401`)
- dropped error path
- narrowed validation (e.g. used to check 3 things, now checks 1)
- deleted test that was covering a real case
- removed `await` that silently dropped a promise

## C · Cross-file tracer

For each function the diff changes, grep for callers and check whether the change breaks any call site:
- new precondition (caller didn't check)
- changed return shape (caller destructures wrong)
- new exception type (caller doesn't catch)
- timing/ordering dependency (caller expected sync)

Also check callees: does a parallel change in the same PR make a call unsafe?

## D · Language-pitfall specialist

Scan for the classic pitfalls of the diff's language/framework.

- **JS/TS**: falsy-zero (`if (count)`), `==` coercion, closure-captured loop var, `for...in` on arrays, `Object.keys` over Map, missing `await` in arrow callbacks
- **Python**: mutable default args, late-binding closures, `is` for value compare, generator exhaustion
- **Go**: nil-map write, range-var capture, slice aliasing, dropped goroutine error
- **SQL**: injection, NULL semantics in WHERE/JOIN (`NOT IN` with NULL row), timezone/DST drift, lexicographic sort on text-encoded timestamps
- **Concurrency**: lock-scope shrink, dropped error in async catch, race on shared map

## E · Wrapper/proxy correctness

When the PR adds or modifies a type that wraps another (cache, proxy, decorator, adapter):
- check every method routes to the **wrapped** instance, not back through a registry/session/global
  - e.g. a caching provider holding a `delegate` field that resolves IDs via `session.get(...)` instead of `delegate.get(...)` will re-enter the cache or recurse
- check the wrapper forwards every method the callers actually use (missing pass-through silently breaks behavior)
- check error-translation: if the wrapper catches and re-throws, does the new type lose information?

---

## Sweep for gaps (after the first pass)

Run **one more finder** as a fresh reviewer who has the verified list. Re-read the diff and enclosing functions looking ONLY for defects not already listed. Don't re-derive what's already there — the job is gaps.

Second-tier footguns the first pass misses:
- moved/extracted code that dropped a guard or anchor
- dataclass default evaluated once
- `hash()` non-determinism across processes
- lock-scope shrink
- predicate methods with side effects
- setup/teardown asymmetry in tests
- config defaults flipped
- **test that asserts the helper's old behavior instead of the new integration** (tautological tests that would pass before AND after the PR's main change)

---

## Verify (one vote per candidate)

For each surviving candidate, return exactly one verdict:

- **CONFIRMED** — you can name the inputs/state that trigger it AND quote the wrong output or crash. Quote the offending line.
- **PLAUSIBLE** — mechanism is real, trigger is uncertain (timing, env, config). State what would confirm.
- **REFUTED** — factually wrong (code doesn't say that) or guarded elsewhere. Quote the line that proves it.

Recall-mode default: a single non-REFUTED vote carries the finding. Don't drop on uncertainty.

Cap at ~15 findings; if more survive, keep the most severe.
