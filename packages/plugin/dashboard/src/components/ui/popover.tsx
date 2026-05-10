// Popover primitive built on @base-ui-components/react/popover.

import { Popover as BasePopover } from "@base-ui-components/react/popover";
import { cn } from "../../lib/cn.ts";

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;

export function PopoverContent({
  className,
  children,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof BasePopover.Popup> & {
  sideOffset?: number;
}) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner sideOffset={sideOffset} className="z-50">
        <BasePopover.Popup
          className={cn(
            "rounded-md border border-border bg-card text-card-foreground shadow-lg outline-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-100",
            className,
          )}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
