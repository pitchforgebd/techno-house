"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { HEADER_BUILDER_LINK } from "@/lib/catalog/primary-nav";
import { cn } from "@/lib/cn";

/**
 * Always-emphasized CTA (copper secondary) — distinct from teal search.
 * Stronger ring when the builder route is current.
 */
export function HeaderBuilderLink({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === "/pc-builder" || pathname.startsWith("/pc-builder/");

  return (
    <Link
      href={HEADER_BUILDER_LINK.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        buttonClassName({
          variant: "secondary",
          size: "sm",
          className: cn(
            "min-h-11 shrink-0 border border-secondary px-4 font-semibold shadow-sm transition-colors",
            "bg-secondary text-white",
            "hover:border-secondary hover:bg-secondary/80 hover:text-white",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
            active && "ring-2 ring-secondary/40 ring-offset-2 ring-offset-surface",
            className,
          ),
        }),
      )}
    >
      {HEADER_BUILDER_LINK.label}
    </Link>
  );
}
