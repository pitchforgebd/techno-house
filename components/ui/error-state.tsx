import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again. If the problem continues, contact support.",
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-4 py-8 text-text",
        className,
      )}
    >
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="max-w-prose text-body text-text-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
