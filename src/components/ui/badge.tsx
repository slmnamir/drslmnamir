import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent-soft text-accent",
        muted: "border-line bg-bg-elevated text-ink-muted",
        success: "border-transparent bg-success-soft text-success",
        warn: "border-transparent bg-warn-soft text-warn",
        danger: "border-transparent bg-danger-soft text-danger",
        flag: "border-transparent bg-flag-soft text-flag",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
