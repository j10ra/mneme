// Dashboard shell. CSS grid: content on the left (status, machines,
// memories — to be added), portrait logs sidebar on the right.
//
// Min-width 1024px enforced via the same media query that drives the
// "open on a wider screen" notice — below that we drop the grid and
// show the notice instead. Single page, no internal routing.

import { LogsPanel } from "./components/LogsPanel.tsx";
import { MachinesPanel } from "./components/MachinesPanel.tsx";
import { StatusPanel } from "./components/StatusPanel.tsx";

export function App() {
  return (
    <div className="min-h-screen">
      {/* Width gate: below 1024px, show the notice instead of the grid. */}
      <div className="block min-[1024px]:hidden p-8">
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
          <h1 className="text-lg font-semibold">Mneme dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This dashboard is desktop-only (≥1024px). On smaller screens,
            use the slash commands (<code>/mneme:status</code>,
            <code>/mneme:recall</code>, …) or open on a wider screen.
          </p>
        </div>
      </div>

      <div className="hidden min-[1024px]:grid h-screen grid-cols-[1fr_400px]">
        <main className="border-r border-border p-6 space-y-6 overflow-y-auto">
          <header className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">Mneme dashboard</h1>
            <span className="text-xs text-muted-foreground">
              loopback · {window.location.host}
            </span>
          </header>

          <StatusPanel />
          <MachinesPanel />

          {/* Memories + graph panels land here next. */}
        </main>

        <aside className="relative bg-muted/30 overflow-hidden">
          <LogsPanel />
        </aside>
      </div>
    </div>
  );
}
