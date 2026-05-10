import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn.ts";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
  {
    variants: {
      variant: {
        default:
          "border-border bg-card text-foreground hover:bg-muted",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
        active:
          "border-success/40 bg-success/10 text-success hover:bg-success/20",
        secondary:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/70",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        xs: "h-6 px-2 text-[10px] uppercase tracking-wider",
        icon: "h-7 w-7 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "sm" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
