// Thin wrapper around react-resizable-panels v4 matching shadcn's Base
// registry pattern. Renames v4's Group/Panel/Separator into the more
// familiar ResizablePanelGroup/ResizablePanel/ResizableHandle names.
//
// The handle is given a wide invisible grab area so the visible 4px
// strip is easy to hit even on the edge of the viewport.

import { GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { cn } from "../../lib/cn.ts";

export function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group
      className={cn(
        "flex h-full w-full data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

export const ResizablePanel = Panel;

export function ResizableHandle({
  withHandle = true,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & { withHandle?: boolean }) {
  return (
    <Separator
      className={cn(
        // Invisible 8px grab area; the visible strip lives inside via the
        // ::before pseudo-element trick (a centered 4px line). Vertical
        // orientation flips dimensions.
        "group relative flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-transparent outline-none",
        "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border before:transition-colors",
        "hover:before:bg-foreground/40 focus-visible:before:bg-foreground/60",
        "data-[orientation=vertical]:h-2 data-[orientation=vertical]:w-full data-[orientation=vertical]:cursor-row-resize",
        "data-[orientation=vertical]:before:left-0 data-[orientation=vertical]:before:right-0 data-[orientation=vertical]:before:top-1/2 data-[orientation=vertical]:before:h-px data-[orientation=vertical]:before:w-full data-[orientation=vertical]:before:translate-x-0 data-[orientation=vertical]:before:-translate-y-1/2",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            "z-10 flex h-7 w-3.5 items-center justify-center rounded-sm border border-border bg-card shadow-sm",
            "opacity-70 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
            "data-[orientation=vertical]:h-3.5 data-[orientation=vertical]:w-7",
          )}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground group-data-[orientation=vertical]:rotate-90" />
        </div>
      )}
    </Separator>
  );
}
