# Verify library claims against source

Load when: a finding's verdict hinges on "library X behaves a certain way" — error swallowing, retry counts, lock granularity, async ordering, default parameters, abort propagation. Don't guess from docs or training data; grep the installed source.

## Where deps live

Bun:
```
node_modules/.bun/<pkg>@<version>+<hash>/node_modules/<pkg>/dist/...
```

npm:
```
node_modules/<pkg>/dist/...
```

pnpm:
```
node_modules/.pnpm/<pkg>@<version>/node_modules/<pkg>/dist/...
```

Find a specific module file:

```bash
find node_modules/.bun -name "stream.js" -path "*hono*" 2>/dev/null
# or
find . -path '*/node_modules' -prune -o -name "<file>" -print 2>/dev/null
```

Read the file with the Read tool (not `cat` — you want the indented line-number view).

---

## Why this matters: a real example

During a review of a PR that moved a database stamp from end-of-stream into a per-batch loop, the question was: **does `s.writeln(...)` throw when the client has disconnected mid-stream?**

Initial assumption: "writeln must throw, otherwise an aborted stream wouldn't be detectable." Almost shipped the review as "REFUTED — the throw protects us from stamping abandoned batches."

Then grep'd the actual Hono source at `node_modules/.bun/hono@4.12.18/.../utils/stream.js`:

```js
async write(input) {
  try {
    if (typeof input === "string") {
      input = this.encoder.encode(input);
    }
    await this.writer.write(input);
  } catch {  // empty catch
  }
  return this;
}
```

The catch is empty. `writeln` silently swallows write-after-abort errors. The per-batch stamp DOES run after a mid-stream abort.

Verdict flipped from REFUTED to CONFIRMED. The fix added `if (s.aborted) return;` before the stamp. Without grepping source, the review would have missed a real correctness gap.

---

## The rule

When a finding's verdict depends on library/framework behavior, spend 30 seconds reading the source. Cost: 30 seconds. Benefit: avoid shipping a wrong "REFUTED" that hides a real bug.

Cases where the rule applies most:
- **Error handling**: does this method throw, return null, or silently no-op?
- **Async/promises**: is this awaited internally, or does it return immediately?
- **Defaults**: what does the docstring say versus what the constructor actually sets?
- **Abort/cancel**: does the library propagate AbortSignal through nested awaits?
- **Locking**: is this lock per-instance, per-class, or process-wide?
- **Retries**: how many attempts before throwing? With what backoff?

If the source confirms your assumption, note it inline in the finding ("verified in `node_modules/.../stream.js`"). It tells reviewers you did the work, and protects the finding from "are you sure?" pushback.
