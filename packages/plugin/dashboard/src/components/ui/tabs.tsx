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

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTab({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn(
        "inline-flex h-7 items-center justify-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors",
        "text-muted-foreground hover:text-foreground",
        "data-[selected]:bg-muted data-[selected]:text-foreground data-[selected]:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
        className,
      )}
      {...props}
    />
  );
}

export function TabsPanel({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel
      className={cn(
        "outline-none data-[hidden]:hidden",
        className,
      )}
      {...props}
    />
  );
}
