"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FooterCtaAccent = "danger" | "info";

const accentClass: Record<
  FooterCtaAccent,
  { idle: string; hover: string; active: string }
> = {
  danger: {
    idle: "border-danger/70 text-primary-foreground",
    hover:
      "hover:border-danger hover:bg-danger hover:text-primary-foreground",
    active: "border-danger bg-danger text-primary-foreground",
  },
  info: {
    idle: "border-info/70 text-primary-foreground",
    hover: "hover:border-info hover:bg-info hover:text-primary-foreground",
    active: "border-info bg-info text-primary-foreground",
  },
};

function FooterOutlineCta({
  href,
  accent,
  children,
}: {
  href: string;
  accent: FooterCtaAccent;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const styles = accentClass[accent];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 w-full items-center justify-center rounded-md px-3 text-label font-medium transition-colors",
        "border bg-transparent",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        styles.idle,
        styles.hover,
        active && styles.active,
      )}
    >
      {children}
    </Link>
  );
}

export function FooterCtaButtons() {
  return (
    <div className="mt-5 flex flex-col gap-2 sm:max-w-xs">
      <FooterOutlineCta href="/contact" accent="danger">
        Report a problem
      </FooterOutlineCta>
      <FooterOutlineCta href="/product-request" accent="info">
        Didn&apos;t find your product?
      </FooterOutlineCta>
    </div>
  );
}
