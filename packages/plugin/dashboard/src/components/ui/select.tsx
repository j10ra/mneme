// Select primitive built on @base-ui-components/react/select.
//
// Mirrors shadcn's Base registry shape: <Select> wraps Root; the named
// exports (SelectTrigger, SelectValue, SelectContent, SelectItem) hide
// Base UI's Portal/Positioner/Popup/List plumbing so callers can write:
//
//   <Select value={mode} onValueChange={setMode}>
//     <SelectTrigger><SelectValue /></SelectTrigger>
//     <SelectContent>
//       <SelectItem value="local">Local logs</SelectItem>
//       <SelectItem value="server">Server logs</SelectItem>
//     </SelectContent>
//   </Select>

import { Select as BaseSelect } from "@base-ui-components/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn.ts";

export const Select = BaseSelect.Root;

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseSelect.Trigger>) {
  return (
    <BaseSelect.Trigger
      className={cn(
        "inline-flex h-7 items-center justify-between gap-2 rounded-md border border-border bg-card px-2 text-xs font-medium outline-none transition-colors",
        "hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/20",
        "data-[popup-open]:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon>
        <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform data-[popup-open]:rotate-180" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

export function SelectValue({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelect.Value>) {
  return (
    <BaseSelect.Value
      className={cn("truncate text-left", className)}
      {...props}
    />
  );
}

export function SelectContent({
  className,
  children,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof BaseSelect.Popup> & {
  sideOffset?: number;
}) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner sideOffset={sideOffset} className="z-50">
        <BaseSelect.Popup
          className={cn(
            "min-w-[var(--anchor-width)] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-lg",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-100",
            className,
          )}
          {...props}
        >
          <BaseSelect.List className="p-1">{children}</BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseSelect.Item>) {
  return (
    <BaseSelect.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none transition-colors",
        "data-[highlighted]:bg-muted data-[selected]:bg-muted/60 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="flex h-3 w-3 shrink-0 items-center justify-center">
        <BaseSelect.ItemIndicator>
          <Check className="h-3 w-3 text-success" />
        </BaseSelect.ItemIndicator>
      </span>
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}
