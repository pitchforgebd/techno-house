"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_NAV } from "@/lib/account/nav";
import { cn } from "@/lib/cn";

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="lg:w-52 lg:shrink-0">
      <ul className="flex flex-wrap gap-1 lg:flex-col">
        {ACCOUNT_NAV.map((item) => {
          const active =
            item.href === "/account"
              ? pathname === "/account"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-label font-medium",
                  active
                    ? "bg-surface-muted text-text"
                    : "text-text-muted hover:bg-surface-muted hover:text-text",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
