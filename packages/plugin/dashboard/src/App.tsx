// Dashboard shell. Resizable horizontal split: content on the left,
// portrait Logs sidebar on the right. Min-width 1024px enforced; below
// that we drop the resizable layout for a friendly notice.

import { LogsPanel } from "./components/LogsPanel.tsx";
import { MachinesPanel } from "./components/MachinesPanel.tsx";
import { MemoriesPanel } from "./components/MemoriesPanel.tsx";
import { StatusPanel } from "./components/StatusPanel.tsx";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable.tsx";

export function App() {
  return (
    <div className="min-h-screen">
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

      <div className="hidden min-[1024px]:block h-screen">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel id="content" minSize="20%">
            <main className="h-full overflow-y-auto p-6 space-y-6">
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h1 className="text-xl font-semibold tracking-tight whitespace-nowrap">
                  Mneme dashboard
                </h1>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  loopback · {window.location.host}
                </span>
              </header>

              <StatusPanel />
              <MachinesPanel />
              <MemoriesPanel />
            </main>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            id="logs"
            defaultSize="60%"
            minSize="280px"
            maxSize="80%"
          >
            <LogsPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
