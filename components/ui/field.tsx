import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const describedBy = [
    error && errorId ? errorId : null,
    hint && !error && hintId ? hintId : null,
  ]
    .filter(Boolean)
    .join(" ");

  const control = Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }
    const el = child as ReactElement<{
      "aria-describedby"?: string;
      "aria-invalid"?: boolean | "true" | "false";
    }>;
    const existing = el.props["aria-describedby"];
    return cloneElement(el, {
      "aria-invalid": error ? true : undefined,
      "aria-describedby":
        [existing, describedBy || null].filter(Boolean).join(" ") || undefined,
    });
  });

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label font-medium text-text">
        {label}
      </label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-caption text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function controlClassName(className?: string) {
  return cn(
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-body text-text",
    "placeholder:text-text-muted",
    // Keeps the global :focus-visible outline for keyboard users; this only
    // adds the pointer-hover and focused-border feedback the controls lacked.
    "transition-colors duration-150 hover:border-text/30 focus:border-primary",
    "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70",
    className,
  );
}
