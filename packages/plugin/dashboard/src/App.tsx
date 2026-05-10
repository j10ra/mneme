// Dashboard shell. Two top-level tabs:
//   - Activity: Status + Machines (left) + Logs sidebar (right, resizable)
//   - Memories: full-width Memories panel
//
// Min-width 1024px enforced; below that we drop the layout for a notice.

import { Activity, Brain } from "lucide-react";
import { useState } from "react";
import { LogsPanel } from "./components/LogsPanel.tsx";
import { MachinesPanel } from "./components/MachinesPanel.tsx";
import { MemoriesPanel } from "./components/MemoriesPanel.tsx";
import { StatusPanel } from "./components/StatusPanel.tsx";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable.tsx";
import { Tabs, TabsList, TabsPanel, TabsTab } from "./components/ui/tabs.tsx";

type Tab = "activity" | "memories";

export function App() {
  const [tab, setTab] = useState<Tab>("activity");

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
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-background px-6 py-3">
            <div className="flex items-center gap-4">
              <h1 className="text-base font-semibold tracking-tight whitespace-nowrap">
                Mneme dashboard
              </h1>
              <TabsList>
                <TabsTab value="activity">
                  <Activity className="h-3.5 w-3.5" />
                  Activity
                </TabsTab>
                <TabsTab value="memories">
                  <Brain className="h-3.5 w-3.5" />
                  Memories
                </TabsTab>
              </TabsList>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              loopback · {window.location.host}
            </span>
          </header>

          <TabsPanel value="activity" className="h-[calc(100vh-57px)]">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel id="content" minSize="20%">
                <main className="h-full overflow-y-auto p-6 space-y-6">
                  <StatusPanel />
                  <MachinesPanel />
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
          </TabsPanel>

          <TabsPanel value="memories" className="h-[calc(100vh-57px)] overflow-y-auto">
            <main className="p-6">
              <MemoriesPanel />
            </main>
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  );
}
