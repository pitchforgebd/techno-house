"use client";

import Link from "next/link";
import { IconCompare, IconHeart } from "@/components/layout/chrome-icons";
import { HeaderCountBadge } from "@/components/layout/header-count-badge";
import { HEADER_ACTION_CLASS } from "@/components/layout/header-action-class";
import { useListsStore } from "@/features/lists/use-lists-store";
import { HEADER_LIST_LINKS } from "@/lib/catalog/primary-nav";

const actionClassName = HEADER_ACTION_CLASS;

const icons = {
  "/wishlist": IconHeart,
  "/compare": IconCompare,
} as const;

export function HeaderListLinks() {
  const { state } = useListsStore();
  const counts: Record<string, number> = {
    "/wishlist": state.wishlist.length,
    "/compare": state.compare.length,
  };

  return (
    <>
      {HEADER_LIST_LINKS.map((item) => {
        const count = counts[item.href] ?? 0;
        const Icon = icons[item.href as keyof typeof icons];
        return (
          <li key={item.href} className="hidden md:block">
            <Link
              href={item.href}
              className={actionClassName}
              aria-label={`${item.label}, ${count} items`}
            >
              {Icon ? <Icon /> : item.label}
              <HeaderCountBadge count={count} />
              <span className="sr-only">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
}
