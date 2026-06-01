# Prune (telemetry retention)

The housekeeper. No memories are touched; this worker only ages out
operational telemetry and expired OAuth codes/refresh tokens under `_ops.*`
so the database stays small and the recall paths stay fast. Runs
server-side, on a 24-hour cadence, all SQL.

> Reads for context: [`../concepts.md`](../concepts.md).

---

## What it does

Each tick deletes aged-out rows from five `_ops.*` tables. The three
telemetry tables and `oauth_refresh` use `TELEMETRY_RETENTION_DAYS` (a
compile-time constant in `infra/config.ts`, default **3 days** — not
env-overridable); `oauth_codes` uses a fixed 1-day window.

| Table | Deletes rows where |
|---|---|
| `_ops.spans` | `started_at` past the retention window — every traced call; the biggest table |
| `_ops.traces` | `started_at` past the window; logs cascade-delete via FK |
| `_ops.logs` | `ts` past the window — traceless `Logger.info/warn/error` lines |
| `_ops.oauth_codes` | `consumed_at` is set, or `expires_at` older than 1 day — one-shot PKCE codes (#59) |
| `_ops.oauth_refresh` | `revoked_at` or `expires_at` past the retention window — rotated/expired refresh tokens (#59) |

Source: [`packages/server/src/worker/prune.ts`](../../packages/server/src/worker/prune.ts) — five `DELETE` statements, one `Logger.info` reporting the row counts.

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

Same reasoning as nap's ["Why server-side, not pg_cron"](./nap.md): portability (no `pg_cron` dependency), shared observability (logs + spans on the same `_ops.*` stream), and versioned constants in `infra/config.ts`.

---

## Configuration

| Constant | Default | Meaning |
|---|---|---|
| `TELEMETRY_RETENTION_DAYS` | `3` | Days of `_ops.*` history to retain. Compile-time constant; not env-overridable. |

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
