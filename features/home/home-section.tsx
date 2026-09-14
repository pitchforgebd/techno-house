import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function HomeSection({
  id,
  title,
  lede,
  heading: Heading,
  action,
  children,
}: {
  id: string;
  title: string;
  lede?: string;
  heading: "h1" | "h2";
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Heading
            id={id}
            className={cn(
              "font-semibold tracking-tight text-text",
              Heading === "h1" ? "text-3xl" : "text-2xl",
            )}
          >
            {title}
          </Heading>
          {lede ? (
            <p className="mt-2 max-w-prose text-body text-text-muted">{lede}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={lede ? "mt-6" : "mt-5"}>{children}</div>
    </section>
  );
}
