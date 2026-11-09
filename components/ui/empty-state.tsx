import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  description,
  action,
  className,
  titleAs = "h2",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** "p" inside site chrome (cart drawer) so it is not a page heading. */
  titleAs?: "h2" | "p";
}) {
  const Title = titleAs;
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-start gap-2 rounded-md border border-border bg-surface px-4 py-8",
        className,
      )}
    >
      <Title
        className={cn(
          "text-lg font-semibold tracking-tight",
          titleAs === "p" && "th-heading-like",
        )}
      >{title}</Title>
      {description ? (
        <p className="max-w-prose text-body text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
