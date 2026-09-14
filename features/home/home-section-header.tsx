import { ArrowRight } from "lucide-react";
import Link from "next/link";

/** Shared homepage section header: title, optional lede, right-aligned link. */
export function HomeSectionHeader({
  id,
  title,
  lede,
  actionHref,
  actionLabel,
}: {
  id: string;
  title: string;
  lede?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border/70 pb-3">
      <div className="min-w-0 border-l-[3px] border-primary pl-3">
        <h2 id={id} className="text-2xl font-semibold tracking-tight text-text">
          {title}
        </h2>
        {lede ? (
          <p className="mt-1.5 text-caption text-text-muted">{lede}</p>
        ) : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="group inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-caption font-semibold text-primary transition-colors hover:bg-primary-soft"
        >
          {actionLabel}
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ) : null}
    </div>
  );
}
