import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "ink"
  | "soft"
  | "light";
export type ButtonSize = "sm" | "md";

/** Solid variants carry a real shadow so they read as raised, not painted on. */
const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md",
  secondary:
    "bg-secondary text-white shadow-sm hover:bg-secondary/90 hover:shadow-md",
  ghost: "bg-transparent text-text hover:bg-surface-muted",
  danger: "bg-danger text-white shadow-sm hover:bg-danger/90 hover:shadow-md",
  ink: "bg-text text-primary-foreground shadow-sm hover:bg-text/90 hover:shadow-md",
  soft: "bg-secondary/20 text-text hover:bg-secondary/30",
  /* For CTAs sitting on a dark image or panel. Exists as a real variant
     because `cn()` is a plain join with no tailwind-merge: passing
     `bg-surface` alongside `variant: "ghost"` left `bg-transparent` in the
     class list too, and that won in the compiled CSS — the hero slider's
     button was invisible until hover, when the `:hover` rule finally
     out-specified it. A variant has no competing background to lose to. */
  light: "bg-surface text-text shadow-sm hover:bg-surface-muted hover:shadow-md",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-label",
  md: "min-h-11 px-4 text-body",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    // `th-btn` marks link-style buttons too, so the storefront's jump-up click
    // feedback reaches them (components/storefront/jump-up-effects.tsx).
    "th-btn inline-flex items-center justify-center rounded-md font-medium",
    "transition-[background-color,box-shadow,transform,color] duration-200 ease-out",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}
