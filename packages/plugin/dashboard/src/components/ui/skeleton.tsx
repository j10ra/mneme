import { cn } from "../../lib/cn.ts";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md bg-muted animate-pulse", className)}
      {...props}
    />
  );
}
