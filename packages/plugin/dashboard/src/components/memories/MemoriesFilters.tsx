// Filter chips for the Memories panel: time range (quick chips), repo,
// machine, kind, cluster status. Time chips are mutually-exclusive
// preset windows; the rest are multi-select toggles. Repo/machine/kind
// values surface from the currently-loaded entries (so the choices
// reflect the actual data, not a hard-coded list).

import { useMemo } from "react";
import { cn } from "../../lib/cn.ts";
import type { Filters, MemoryRowData } from "./types.ts";

const TIME_CHIPS: Array<{ label: string; days: number | null }> = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "all", days: null },
];

const CLUSTER_CHIPS = [
  { label: "in cluster", value: "in_cluster" },
  { label: "orphaned", value: "orphaned" },
  { label: "superseded", value: "superseded" },
  { label: "shadow", value: "shadow" },
];

export function MemoriesFilters({
  filters,
  onChange,
  entries,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  entries: MemoryRowData[];
}) {
  // Distinct values from the loaded set, capped to keep UI tight.
  const repos = useMemo(
    () => distinct(entries.map((m) => m.repo)).slice(0, 8),
    [entries],
  );
  const machines = useMemo(
    () =>
      distinctMap(
        entries
          .filter((m): m is MemoryRowData & { machine_id: string } =>
            Boolean(m.machine_id),
          )
          .map((m) => [m.machine_id, m.machine_name ?? m.machine_id.slice(0, 8)]),
      ).slice(0, 8),
    [entries],
  );
  const kinds = useMemo(
    () => distinct(entries.map((m) => m.kind)).slice(0, 12),
    [entries],
  );

  const activeTime = useMemo(() => {
    if (!filters.since) return "all";
    const ms = Date.now() - new Date(filters.since).getTime();
    const days = Math.round(ms / 86_400_000);
    if (days <= 1) return "24h";
    if (days <= 7) return "7d";
    if (days <= 30) return "30d";
    return "all";
  }, [filters.since]);

  function setTime(days: number | null) {
    onChange({
      ...filters,
      since: days === null ? null : new Date(Date.now() - days * 86_400_000).toISOString(),
    });
  }

  function toggle(field: "repo" | "machine_id" | "kind" | "cluster_status", value: string) {
    const cur = filters[field];
    const next = cur.includes(value)
      ? cur.filter((v) => v !== value)
      : cur.concat(value);
    onChange({ ...filters, [field]: next });
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-card/50 px-3 py-2">
      <Row label="time">
        {TIME_CHIPS.map((t) => (
          <Chip
            key={t.label}
            active={activeTime === t.label}
            onClick={() => setTime(t.days)}
          >
            {t.label}
          </Chip>
        ))}
      </Row>

      {machines.length > 0 && (
        <Row label="machines">
          {machines.map(([id, name]) => (
            <Chip
              key={id}
              active={filters.machine_id.includes(id)}
              onClick={() => toggle("machine_id", id)}
            >
              {name}
            </Chip>
          ))}
        </Row>
      )}

      {repos.length > 0 && (
        <Row label="repos">
          {repos.map((r) => (
            <Chip
              key={r}
              active={filters.repo.includes(r)}
              onClick={() => toggle("repo", r)}
            >
              {r}
            </Chip>
          ))}
        </Row>
      )}

      {kinds.length > 0 && (
        <Row label="kind">
          {kinds.map((k) => (
            <Chip
              key={k}
              active={filters.kind.includes(k)}
              onClick={() => toggle("kind", k)}
            >
              {k}
            </Chip>
          ))}
        </Row>
      )}

      <Row label="cluster">
        {CLUSTER_CHIPS.map((c) => (
          <Chip
            key={c.value}
            active={filters.cluster_status.includes(c.value)}
            onClick={() => toggle("cluster_status", c.value)}
          >
            {c.label}
          </Chip>
        ))}
      </Row>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
      <span className="w-16 shrink-0 text-muted-foreground/70 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-5 items-center rounded-full border px-2 transition-colors",
        active
          ? "border-foreground/30 bg-foreground/10 text-foreground"
          : "border-border/60 bg-transparent text-muted-foreground/70 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function distinct<T>(arr: Array<T | null | undefined>): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const v of arr) {
    if (v == null || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function distinctMap<K, V>(pairs: Array<[K, V]>): Array<[K, V]> {
  const seen = new Set<K>();
  const out: Array<[K, V]> = [];
  for (const [k, v] of pairs) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push([k, v]);
  }
  return out;
}
