import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "sale" | "new" | "stock" | "warranty" | "neutral";

const tones: Record<BadgeTone, string> = {
  sale: "bg-danger/10 text-danger",
  new: "bg-info/10 text-info",
  stock: "bg-success/10 text-success",
  warranty: "bg-primary/10 text-primary",
  neutral: "bg-surface-muted text-text-muted",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
