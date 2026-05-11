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

  Logger.info("prune: telemetry pruned", {
    spans: spans.count,
    traces: traces.count,
    logs: logs.count,
    retention_days: TELEMETRY_RETENTION_DAYS,
  });
}
