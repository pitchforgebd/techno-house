"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin/pc-builder", label: "Overview" },
  { href: "/admin/pc-builder/rules", label: "Compatibility rules" },
  { href: "/admin/pc-builder/compatibility", label: "Compatibility data" },
  { href: "/admin/pc-builder/builds", label: "Saved builds" },
] as const;

export function AdminPcBuilderSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-neutral-200 pb-px"
      aria-label="PC Builder sections"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/admin/pc-builder"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border border-b-0 border-neutral-200 bg-white text-[#6c5ce7]"
                : "text-neutral-500 hover:text-neutral-800",
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
