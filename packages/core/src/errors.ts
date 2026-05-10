// errorMessageOf — duck-typed extraction of an error's message string.
//
// The naive `err instanceof Error ? err.message : String(err)` pattern
// silently corrupts non-Error throwables that nonetheless carry a
// readable `.message` (notably Bun's fetch rejection objects, which are
// plain objects with `message` + `code` but no Error prototype). Those
// fall through to `String(err)`, which calls `Object.prototype.toString`
// and produces the famous `"[object Object]"` — losing the actual
// failure reason.
//
// This helper short-circuits any object that exposes a string `message`
// before reaching the `String(err)` fallback.

export function errorMessageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (
    err !== null &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return String(err);
}
