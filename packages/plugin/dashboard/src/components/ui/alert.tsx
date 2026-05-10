import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn.ts";

const alertVariants = cva("rounded-md border px-3 py-2 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-card text-foreground",
      destructive:
        "border-destructive/50 bg-destructive/10 text-destructive",
      warning: "border-warning/40 bg-warning/10 text-warning",
    },
  },
  defaultVariants: { variant: "default" },
});

export type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>;

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5 className={cn("text-sm font-medium leading-tight", className)} {...props} />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-1 text-xs opacity-80", className)} {...props} />
  );
}
