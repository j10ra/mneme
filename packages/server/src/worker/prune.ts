import { Logger } from "@mneme/core";
import { TELEMETRY_RETENTION_DAYS } from "../infra/config.ts";
import { sql } from "../infra/db.ts";

export async function runPruneOnce(): Promise<void> {
  const cutoff = `${TELEMETRY_RETENTION_DAYS} days`;

  const spans = await sql`
    DELETE FROM _ops.spans
    WHERE started_at < now() - ${cutoff}::interval
  `;
  const traces = await sql`
    DELETE FROM _ops.traces
    WHERE started_at < now() - ${cutoff}::interval
  `;
  const logs = await sql`
    DELETE FROM _ops.logs
    WHERE ts < (now() - ${cutoff}::interval)
  `;

  // OAuth (#59): auth codes are one-shot/60s — drop consumed or expired
  // ones after a day. Refresh tokens rotate single-use; drop revoked or
  // expired ones past the telemetry retention window. Active clients and
  // live tokens are untouched.
  const codes = await sql`
    DELETE FROM _ops.oauth_codes
    WHERE consumed_at IS NOT NULL OR expires_at < now() - interval '1 day'
  `;
  const refresh = await sql`
    DELETE FROM _ops.oauth_refresh
    WHERE (revoked_at IS NOT NULL AND revoked_at < now() - ${cutoff}::interval)
       OR (expires_at IS NOT NULL AND expires_at < now() - ${cutoff}::interval)
  `;

  Logger.info("prune: telemetry pruned", {
    spans: spans.count,
    traces: traces.count,
    logs: logs.count,
    oauth_codes: codes.count,
    oauth_refresh: refresh.count,
    retention_days: TELEMETRY_RETENTION_DAYS,
  });
}
