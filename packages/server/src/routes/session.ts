// Routes for SessionStart hook context injection.
//
//   POST /api/session/start  → rendered surface markdown for a workspace
//
// Aggregates about + concepts + pinned + rules + recent decisions + recent sessions
// for a set of repos (workspace = N repos, single repo = length 1).
// Cross-machine: filtered by repo, unioned across machine_id. Returns
// rendered markdown the hook prints to stdout for SessionStart context
// injection.

import type { Hono } from "hono";
import { currentAuth, mnemeRoute, requireAuth } from "@mneme/core";
import { type SessionStartRepos, resolveRepos } from "../lib/session-repos.ts";
import { buildSurface } from "../services/surface.ts";

type SessionStartBody = SessionStartRepos & {
  machine_id?: string;
  session_id?: string | null;
};

export function mountSessionRoutes(app: Hono): void {
  app.post(
    "/api/session/start",
    mnemeRoute("api.session.start"),
    requireAuth("read"),
    async (c) => {
      const body = ((await c.req.json().catch(() => ({}))) ?? {}) as SessionStartBody;
      const repos = resolveRepos(body);
      // Server-stamped machine_id from the bearer token. Admin-token callers
      // (machineId === null) get only public rows. The body's machine_id is
      // ignored for privacy enforcement so a machine can't impersonate another.
      const auth = currentAuth();
      const surface = await buildSurface(repos, auth?.machineId ?? null);

      return c.json(surface);
    },
  );
}
