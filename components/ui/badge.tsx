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

export type BadgeSize = "sm" | "md";

/** `cn` here is a plain joiner (no tailwind-merge), so size can't be a
 * `className` override — a same-specificity `text-caption`/`text-label`
 * pair would depend on stylesheet rule order, not prop order. It has to be
 * baked into the variant instead. */
const sizes: Record<BadgeSize, string> = {
  sm: "px-2.5 py-0.5 text-caption font-medium",
  md: "px-3 py-1 text-label font-bold",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  size?: BadgeSize;
};

export function Badge({
  tone = "neutral",
  size = "sm",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full",
        sizes[size],
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
