// Routes for SessionStart hook context injection.
//
//   POST /api/session/start  → rendered surface markdown for a workspace
//
// Aggregates pinned + rules + themes + recent decisions + recent sessions
// for a set of repos (workspace = N repos, single repo = length 1).
// Cross-machine: filtered by repo, unioned across machine_id. Returns
// rendered markdown the hook prints to stdout for SessionStart context
// injection.

import type { Hono } from "hono";
import { currentAuth, mnemeRoute, requireAuth } from "@mneme/core";
import { buildSurface } from "../services/surface.ts";

type SessionStartBody = {
  machine_id?: string;
  repos?: string[];
  /** legacy single-repo field; preserved so older plugin versions still work */
  repo?: string | null;
  session_id?: string | null;
};

export function mountSessionRoutes(app: Hono): void {
  app.post(
    "/api/session/start",
    mnemeRoute("api.session.start"),
    requireAuth("read"),
    async (c) => {
      const body = ((await c.req.json().catch(() => ({}))) ?? {}) as SessionStartBody;
      const repos = Array.isArray(body.repos)
        ? body.repos.filter((r): r is string => typeof r === "string" && r.length > 0)
        : typeof body.repo === "string" && body.repo
          ? [body.repo]
          : [];
      // Server-stamped machine_id from the bearer token. Admin-token callers
      // (machineId === null) get only public rows. The body's machine_id is
      // ignored for privacy enforcement so a machine can't impersonate another.
      const auth = currentAuth();
      const surface = await buildSurface(repos, auth?.machineId ?? null);

      return c.json(surface);
    },
  );
}
