// Canonicalize a repo identity so the same logical project resolves to one
// stable key everywhere it is stored or queried. The client derives `repo`
// from `git remote get-url origin` (see plugin core/scope.ts), but that leaks
// three non-canonical forms into `memories.repo` / `captures.repo`:
//   - credential-embedded clone URLs (`user:token@github.com/owner/repo`),
//     which also leak a live token into the column,
//   - raw remote URLs that bypass canonicalRepo (https/ssh, `.git` suffix),
//   - host-case and trailing-slash variants.
// Each variant splits one project into several `repo` values, so the surface's
// `repo = ANY(...)` match and crystallize's per-repo grouping silently fragment.
//
// The `dir:` fallback (no remote detected) cannot be resolved to a real project
// here, so it is left intact apart from a trailing-slash trim.

export function normalizeRepo(repo: string | null | undefined): string | null {
  if (!repo) return null;
  let s = repo.trim();

  if (!s) return null;
  if (s.startsWith("dir:")) return s.replace(/\/+$/, "");

  // Drop URL scheme (https://, ssh://, git://).
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");

  // Strip userinfo: anything up to and including the first `@` that precedes
  // the path. A path-internal `@` (after the first `/`) is left untouched.
  const slash = s.indexOf("/");
  const at = s.indexOf("@");

  if (at !== -1 && (slash === -1 || at < slash)) s = s.slice(at + 1);

  // scp-style `host:path` -> `host/path` (skip a `host:port` numeric segment).
  s = s.replace(/^([^/:]+):(?!\d+\/)/, "$1/");

  // Trim a `.git` suffix and any trailing slashes.
  s = s.replace(/\.git$/, "").replace(/\/+$/, "");

  // Lowercase the host segment; preserve path case (paths can be case-sensitive
  // and must match what the client stored).
  const i = s.indexOf("/");

  s = i === -1 ? s.toLowerCase() : s.slice(0, i).toLowerCase() + s.slice(i);

  return s || null;
}
