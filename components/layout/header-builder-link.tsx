"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { HEADER_BUILDER_LINK } from "@/lib/catalog/primary-nav";
import { cn } from "@/lib/cn";

/**
 * Always-emphasized CTA. The background is the logo's own two colours —
 * electric blue running into the near-black — with the highlight sweep
 * layered over it (see `.th-cta-sheen`). Stronger ring when the builder
 * route is current.
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
          variant: "primary",
          size: "sm",
          className: cn(
            "min-h-11 shrink-0 gap-2 px-4 text-[0.9rem] font-bold tracking-tight whitespace-nowrap text-white lg:px-5",
            // `th-cta-sheen` paints both the brand gradient and the sweeping
            // highlight; it is built from tokens so a Design Studio base
            // colour still drives the button.
            "th-cta-sheen",
            // A shadow tinted with the button's own colour, not neutral black.
            "shadow-md shadow-primary/35 hover:shadow-lg hover:shadow-primary/50",
            "motion-safe:hover:-translate-y-0.5",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            // Inset ring reads correctly on both the dark header and the light
            // mobile sheet; the old ring-offset-surface assumed a white
            // backdrop and left a pale gap against the dark header.
            active && "ring-2 ring-inset ring-white/55",
            className,
          ),
        }),
      )}
    >
      <Cpu aria-hidden strokeWidth={2.25} className="size-[1.05rem] shrink-0" />
      {HEADER_BUILDER_LINK.label}
    </Link>
  );
}
