// Dashboard shell. Sidebar layout:
//   Left: vertical icon nav (Activity / Memories)
//   Right: top header strip + active tab panel
//
// Min-width 1024px enforced; below that we drop the layout for a
// notice and tell the operator to use slash commands instead.

import { Activity, Brain, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
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
type Theme = "dark" | "light";

const THEME_KEY = "mneme.dashboard.theme";

function loadTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function App() {
  const [tab, setTab] = useState<Tab>("activity");
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore quota / disabled */
    }
  }, [theme]);

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

      <div className="hidden min-[1024px]:flex h-screen bg-background">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          orientation="vertical"
          className="flex h-full w-full"
        >
          {/* Sidebar — fixed-width icon nav. No border; the content
              card visually separates itself with its own border. */}
          <aside className="flex w-14 shrink-0 flex-col items-center gap-2 py-3">
            <div
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-foreground/5 text-base font-semibold"
              title="Mneme"
            >
              M
            </div>
            <TabsList>
              <TabsTab value="activity" title="Activity">
                <Activity className="h-4 w-4" />
              </TabsTab>
              <TabsTab value="memories" title="Memories">
                <Brain className="h-4 w-4" />
              </TabsTab>
            </TabsList>
          </aside>

          {/* Right column: chrome (title strip) + body card. The header
              sits outside the card so the card is purely content. Card
              has full rounded corners and a gap on every side. */}
          <div className="flex flex-1 flex-col gap-3 p-3">
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 py-1">
              <div className="flex items-baseline gap-3">
                <h1 className="text-base font-semibold tracking-tight whitespace-nowrap">
                  Mneme dashboard
                </h1>
                <span className="text-xs text-muted-foreground capitalize whitespace-nowrap">
                  {tab}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LoopbackPill host={window.location.host} />
                <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
                <a
                  href="https://github.com/j10ra/mneme"
                  target="_blank"
                  rel="noreferrer noopener"
                  title="github.com/j10ra/mneme"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  <GithubIcon />
                </a>
              </div>
            </header>

            <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
              <TabsPanel value="activity" className="flex-1 min-h-0">
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

              <TabsPanel value="memories" className="flex-1 min-h-0">
                <MemoriesPanel />
              </TabsPanel>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function LoopbackPill({ host }: { host: string }) {
  return (
    <span
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 text-[11px] text-muted-foreground"
      title="Dashboard is served on this machine's loopback"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
      <span className="font-medium text-foreground/80">loopback</span>
      <span className="font-mono">{host}</span>
    </span>
  );
}

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 fill-current"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
    >
      {theme === "dark" ? (
        <Sun className="h-3.5 w-3.5" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
