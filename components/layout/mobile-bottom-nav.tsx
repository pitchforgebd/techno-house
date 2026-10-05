"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CircleUser,
  Monitor,
  PackageOpen,
  ShoppingCart,
} from "lucide-react";
import { useCustomerSession } from "@/features/account/customer-session-provider";
import { useCartStore } from "@/features/cart/use-cart-store";
import { useListsStore } from "@/features/lists/use-lists-store";
import { cartItemCount } from "@/lib/cart/cart";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Monitor;
  match: (pathname: string) => boolean;
  badge?: number;
};

function CountBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }
  return (
    <span className="absolute -top-1 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold tabular-nums leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const session = useCustomerSession();
  const { state: cart } = useCartStore();
  const { state: lists } = useListsStore();
  const cartCount = cartItemCount(cart);
  const compareCount = lists.compare.length;

  const accountLabel = session?.phone
    ? session.phone
    : session
      ? "Account"
      : "Account";
  const accountHref = session ? "/account" : "/account/login";

  const items: NavItem[] = [
    {
      href: "/pc-builder",
      label: "PC Builder",
      icon: Monitor,
      match: (path) => path === "/pc-builder" || path.startsWith("/pc-builder/"),
    },
    {
      href: "/offers",
      label: "Offers",
      icon: PackageOpen,
      match: (path) => path === "/offers" || path.startsWith("/offers/"),
    },
    {
      href: "/cart",
      label: "Cart",
      icon: ShoppingCart,
      match: (path) => path === "/cart" || path.startsWith("/cart/"),
      badge: cartCount,
    },
    {
      href: "/compare",
      label: "Compare",
      icon: ArrowLeftRight,
      match: (path) => path === "/compare" || path.startsWith("/compare/"),
      badge: compareCount,
    },
    {
      href: accountHref,
      label: accountLabel,
      icon: CircleUser,
      match: (path) => path.startsWith("/account"),
    },
  ];

  return (
    <nav
      aria-label="Mobile quick links"
      className="border-t border-white/10 bg-[#0e1a24] text-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-catalog grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-cart-jump={item.href === "/cart" ? "" : undefined}
                className={cn(
                  "th-icon-hop flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center transition-colors",
                  active
                    ? "text-white"
                    : "text-white/75 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "relative inline-flex size-9 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary text-primary-foreground shadow-sm shadow-black/25",
                  )}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={active ? 2.25 : 1.75}
                    aria-hidden
                  />
                  {typeof item.badge === "number" ? (
                    <CountBadge count={item.badge} />
                  ) : null}
                </span>
                <span className="max-w-full truncate text-[10px] leading-tight font-medium">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
