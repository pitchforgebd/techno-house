"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Bell,
  Cpu,
  Heart,
  LayoutGrid,
  MapPin,
  MessageCircleQuestion,
  Package,
  Star,
  UserRound,
  LifeBuoy,
  BadgeCheck,
  Tags,
} from "lucide-react";
import {
  ACCOUNT_NAV,
  B2B_PANEL_NAV,
  type AccountNavItem,
} from "@/lib/account/nav";
import { useB2BSession } from "@/features/account/customer-session-provider";
import { cn } from "@/lib/cn";

const ICONS: Record<AccountNavItem["icon"], LucideIcon> = {
  overview: LayoutGrid,
  orders: Package,
  builds: Cpu,
  addresses: MapPin,
  wishlist: Heart,
  compare: ArrowLeftRight,
  reviews: Star,
  questions: MessageCircleQuestion,
  support: LifeBuoy,
  notifications: Bell,
  profile: UserRound,
  wholesale: BadgeCheck,
  pricing: Tags,
};

export function AccountNav() {
  const pathname = usePathname();
  const b2b = useB2BSession();
  // The wholesale panel is a separate set of routes, not the retail nav with
  // extras bolted on — following "Orders" inside /b2b must stay inside /b2b.
  const inB2BPanel = b2b !== null && pathname.startsWith("/b2b");
  const items = inB2BPanel ? B2B_PANEL_NAV : ACCOUNT_NAV;

  return (
    <nav aria-label="Account" className="lg:w-60 lg:shrink-0">
      {/*
        Scrolls horizontally below `lg` rather than wrapping to four ragged
        rows, which is what ten items did on a phone.
      */}
      <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          // Both panels have a root entry that would otherwise match every
          // child route below it.
          const isRoot = item.href === "/account" || item.href === "/b2b";
          const active = isRoot
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-3 py-2.5 text-label font-medium whitespace-nowrap transition-colors duration-200",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-text-muted hover:bg-surface-muted hover:text-text",
                )}
                aria-current={active ? "page" : undefined}
              >
                {/* Bar marks the active page on the sidebar only; on the
                    horizontal strip it would sit across the label. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1.5 bottom-1.5 left-0 hidden w-0.5 rounded-full bg-primary lg:block",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon
                  aria-hidden
                  strokeWidth={1.75}
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active ? "text-primary" : "text-text-muted group-hover:text-text",
                  )}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
