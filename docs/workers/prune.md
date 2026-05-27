# Prune (telemetry retention)

The housekeeper. No memories are touched; this worker only ages out the
operational telemetry tables under `_ops.*` so the database stays small
and the recall paths stay fast. Runs server-side, on a 24-hour cadence,
all SQL.

> Reads for context: [`../concepts.md`](../concepts.md).

---

## What it does

Each tick deletes rows older than `TELEMETRY_RETENTION_DAYS` (default
**3 days**, configurable via env / `infra/config.ts`) from three
telemetry tables:

| Table | Cutoff column | Notes |
|---|---|---|
| `_ops.spans` | `started_at` | every traced function call; the biggest table in steady state |
| `_ops.traces` | `started_at` | parents of spans; logs cascade-delete via FK |
| `_ops.logs` | `ts` | traceless `Logger.info/warn/error` lines |

Source: [`packages/server/src/worker/prune.ts`](../../packages/server/src/worker/prune.ts) — ~30 lines, three `DELETE` statements, one `Logger.info` reporting the row counts.

`_ops.logs` rows that have a `trace_id` cascade-delete with their
parent trace via the FK added in migration `0008_logs_prune.sql`.
Traceless logs are handled by the third `DELETE`.

---

## When it runs

Registered in [`packages/server/src/worker/index.ts`](../../packages/server/src/worker/index.ts) alongside `nap`, `keepalive`, and the gated `digest`. (Dream is daemon-side, registered in [`packages/daemon/src/index.ts`](../../packages/daemon/src/index.ts).)

```ts
register({
  name: "prune",
  scheduleMs: 24 * 60 * 60 * 1000,   // 24h
  run: runPruneOnce,
});
```

The scheduler persists `next_run_at` to `_ops.worker_runs` so a redeploy
mid-cycle doesn't skip the schedule.

---

## Why app-level

- **Portability** — `pg_cron` isn't available on Railway / Neon / most
  managed Postgres providers. The app-level worker runs anywhere Bun does.
- **Observability** — the worker emits logs and spans on the same
  telemetry stream as everything else, so a missed prune shows up in
  the same `_ops.spans` query path you'd use to debug nap or push.
- **Versioning** — retention windows live in `infra/config.ts` next to
  the rest of the constants.

---

## Configuration

| Env / constant | Default | Meaning |
|---|---|---|
| `TELEMETRY_RETENTION_DAYS` | `3` | Days of `_ops.*` history to retain. |

To change retention, edit `packages/server/src/infra/config.ts` and
redeploy. The next prune tick uses the new value; older rows beyond the
new cutoff are removed on the next run.

---

## Steady-state size

At `TELEMETRY_RETENTION_DAYS=3` and typical daemon traffic from a
two-machine setup:

- `_ops.spans` ≈ 20-30 MB (most of the volume)
- `_ops.traces` ≈ 3-5 MB
- `_ops.logs` ≈ <1 MB

Spikes (heavy migration windows, debug runs) inflate `_ops.spans`
temporarily; the next 24h cycle brings it back.

---

## See also

- [`nap.md`](./nap.md) — the maintenance pass on `public.memories`. Same "app-level beats pg_cron for portability + observability" reasoning.
- [`dream.md`](./dream.md), [`digest.md`](./digest.md) — the LLM-in-the-loop workers; prune is the only worker with zero LLM cost.
- [`../capture-pipeline.md`](../capture-pipeline.md) — explains what generates the spans/traces/logs in the first place.
