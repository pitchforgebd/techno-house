import type { ReactNode } from "react";
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

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label font-medium text-text">
        {label}
      </label>
      {children}
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
    "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70",
    className,
  );
}
