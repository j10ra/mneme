import { Switch as BaseSwitch } from "@base-ui-components/react/switch";
import { cn } from "../../lib/cn.ts";

export type SwitchProps = Omit<
  React.ComponentProps<typeof BaseSwitch.Root>,
  "render"
>;

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <BaseSwitch.Root
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 data-[checked]:bg-success/80 data-[checked]:border-success/60 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb className="pointer-events-none ml-0.5 block h-4 w-4 rounded-full bg-background shadow ring-0 transition-transform data-[checked]:translate-x-4" />
    </BaseSwitch.Root>
  );
}
