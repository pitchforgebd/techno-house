"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const SETTINGS_LINKS = [
  { href: "/admin/settings", label: "Business" },
  { href: "/admin/settings/features", label: "Features" },
  { href: "/admin/settings/languages", label: "Languages" },
  { href: "/admin/settings/currency", label: "Currency" },
  { href: "/admin/smtp", label: "SMTP" },
  { href: "/admin/settings/filesystem", label: "File system" },
  { href: "/admin/settings/social", label: "Social logins" },
  { href: "/admin/settings/google", label: "Google" },
  { href: "/admin/shipping", label: "Shipping" },
] as const;

export function AdminSettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="flex flex-wrap gap-1 border-b border-border pb-3"
    >
      {SETTINGS_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-caption font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-text-muted hover:bg-surface-muted hover:text-text",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
