// Tabs primitive built on @base-ui-components/react/tabs.
//
// Usage:
//   <Tabs value={tab} onValueChange={setTab}>
//     <TabsList>
//       <TabsTab value="activity">Activity</TabsTab>
//       <TabsTab value="memories">Memories</TabsTab>
//     </TabsList>
//     <TabsPanel value="activity">…</TabsPanel>
//     <TabsPanel value="memories">…</TabsPanel>
//   </Tabs>

import { Tabs as BaseTabs } from "@base-ui-components/react/tabs";
import { cn } from "../../lib/cn.ts";

export const Tabs = BaseTabs.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-muted/30 p-1",
        // Vertical orientation: column layout, no border (sidebar's
        // already a chrome surface), tighter spacing.
        "data-[orientation=vertical]:flex-col data-[orientation=vertical]:h-auto data-[orientation=vertical]:items-stretch data-[orientation=vertical]:border-0 data-[orientation=vertical]:bg-transparent data-[orientation=vertical]:p-0 data-[orientation=vertical]:gap-2",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTab({ className, ...props }: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn(
        "relative inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all",
        // Inactive
        "text-muted-foreground hover:text-foreground hover:bg-muted/40",
        // Active (aria-selected=true is what Base UI sets on the active Tab)
        "aria-selected:bg-card aria-selected:text-sky-400 aria-selected:shadow-sm",
        "aria-selected:ring-1 aria-selected:ring-sky-500/40",
        "aria-selected:pl-5",
        "aria-selected:before:absolute aria-selected:before:left-1.5 aria-selected:before:top-1/2 aria-selected:before:h-1 aria-selected:before:w-1 aria-selected:before:-translate-y-1/2 aria-selected:before:rounded-full aria-selected:before:bg-sky-400 aria-selected:before:shadow-[0_0_4px] aria-selected:before:shadow-sky-400/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
        // Vertical: square icon-only buttons, leading dot becomes a left
        // tone bar, no padding gymnastics for text.
        "data-[orientation=vertical]:h-10 data-[orientation=vertical]:w-10 data-[orientation=vertical]:px-0 data-[orientation=vertical]:rounded-lg",
        "data-[orientation=vertical]:aria-selected:pl-0",
        "data-[orientation=vertical]:aria-selected:before:left-0 data-[orientation=vertical]:aria-selected:before:top-2 data-[orientation=vertical]:aria-selected:before:h-6 data-[orientation=vertical]:aria-selected:before:w-0.5 data-[orientation=vertical]:aria-selected:before:translate-y-0 data-[orientation=vertical]:aria-selected:before:rounded-r data-[orientation=vertical]:aria-selected:before:shadow-none",
        className,
      )}
      {...props}
    />
  );
}

export function TabsPanel({ className, ...props }: React.ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel className={cn("outline-none data-[hidden]:hidden", className)} {...props} />
  );
}
