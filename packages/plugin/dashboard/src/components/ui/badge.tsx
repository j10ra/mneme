import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn.ts";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        secondary: "border-transparent bg-muted text-muted-foreground",
        success: "border-success/40 bg-success/10 text-success",
        warning: "border-warning/40 bg-warning/10 text-warning",
        destructive: "border-destructive/50 bg-destructive/10 text-destructive",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
