// Filter chips for the Memories panel: time range (quick chips), repo,
// machine, kind, cluster status. Time chips are mutually-exclusive
// preset windows; the rest are multi-select toggles. Repo/machine/kind
// values surface from the currently-loaded entries (so the choices
// reflect the actual data, not a hard-coded list).

import { useMemo } from "react";
import { cn } from "../../lib/cn.ts";
import type { Filters } from "./types.ts";

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
  knownKinds,
  knownRepos,
  knownMachines,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  /** Sticky facet sets accumulated across every fetch so applying a
   *  chip doesn't make the other choices disappear. */
  knownKinds: Set<string>;
  knownRepos: Set<string>;
  knownMachines: Map<string, string>;
}) {
  // Render chips for the union of (a) every value ever seen and (b)
  // any value currently active (defensive — covers cases where a user
  // had a chip selected before any matching row was returned).
  const repos = useMemo(() => {
    const set = new Set<string>(knownRepos);
    for (const r of filters.repo) set.add(r);
    return [...set].sort();
  }, [knownRepos, filters.repo]);
  const machines = useMemo(() => {
    const map = new Map(knownMachines);
    for (const id of filters.machine_id) {
      if (!map.has(id)) map.set(id, id.slice(0, 8));
    }
    return [...map.entries()];
  }, [knownMachines, filters.machine_id]);
  const kinds = useMemo(() => {
    const set = new Set<string>(knownKinds);
    for (const k of filters.kind) set.add(k);
    return [...set].sort();
  }, [knownKinds, filters.kind]);

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

  /** Active = "this value is being used as a filter". Inactive (the
   *  default for every chip) = "no filter on this dimension". When no
   *  chips are active, no filter is applied → all rows show. */
  function toggle(
    field: "repo" | "machine_id" | "kind" | "cluster_status",
    value: string,
  ) {
    const cur = filters[field];
    const next = cur.includes(value)
      ? cur.filter((v) => v !== value)
      : cur.concat(value);
    onChange({ ...filters, [field]: next });
  }

  function isActive(
    field: "repo" | "machine_id" | "kind" | "cluster_status",
    value: string,
  ): boolean {
    return filters[field].includes(value);
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
              active={isActive("machine_id", id)}
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
              active={isActive("repo", r)}
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
              active={isActive("kind", k)}
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
            active={isActive("cluster_status", c.value)}
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

