// Canonical repo keys for the /api/session/start read path.
//
// Lives in lib/ (not the route) so it is importable without the server's env
// + db module graph — the route pulls in `infra/env.ts`, which throws unless a
// full environment is present, and this logic is worth testing on a bare
// checkout.

import { normalizeRepo } from "./normalize-repo.ts";

export type SessionStartRepos = {
  repos?: string[];
  /** legacy single-repo field; preserved so older plugin versions still work */
  repo?: string | null;
};

/** Canonical repo keys to match the surface against, from a request body.
 *
 *  The client sends `repo` straight from `git remote get-url origin`, so it
 *  carries the non-canonical forms ingest already normalizes away before
 *  writing the column (userinfo prefixes, scheme, `.git`, host case).
 *  Normalizing only on the write path left this read matching raw keys
 *  against normalized rows, so an Azure remote (`https://org@dev.azure.com/…`)
 *  matched nothing and the hook injected an empty surface. Both sides of the
 *  surface's `repo = ANY(...)` must be canonical.
 *
 *  Deduped: distinct raw spellings of one project collapse to a single key. */
export function resolveRepos(body: SessionStartRepos): string[] {
  const raw = Array.isArray(body.repos)
    ? body.repos.filter((r): r is string => typeof r === "string" && r.length > 0)
    : typeof body.repo === "string" && body.repo
      ? [body.repo]
      : [];

  return [...new Set(raw.map(normalizeRepo).filter((r): r is string => r !== null))];
}
