"use client";

import Link from "next/link";
import { createElement, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Megaphone,
  Image,
  LineChart,
  BarChart3,
  Palette,
  Headset,
  Smartphone,
  CreditCard,
  Settings,
  UserCog,
  Search,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useStaffSession } from "@/features/admin/staff-session-provider";
import { ADMIN_SIDEBAR_BG } from "@/lib/admin/admin-chrome";
import {
  ADMIN_NAV_GROUPS,
  isAdminNavActive,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/lib/admin/nav";
import {
  filterAdminNavGroups,
  staffHomeHref,
} from "@/lib/auth/admin-route-permissions";
import { cn } from "@/lib/cn";

const GROUP_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  catalog: Package,
  sales: ShoppingCart,
  customers: Users,
  merchandising: Tag,
  marketing: Megaphone,
  content: Image,
  insights: LineChart,
  report: BarChart3,
  experience: Palette,
  support: Headset,
  operations: Smartphone,
  integrations: CreditCard,
  setup: Settings,
  staff: UserCog,
};

const NAV_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/products": Package,
  "/admin/orders": ShoppingCart,
  "/admin/customers": Users,
  "/admin/promotions": Tag,
  "/admin/marketing": Megaphone,
  "/admin/analytics": LineChart,
  "/admin/reports": BarChart3,
  "/admin/design-studio": Palette,
  "/admin/media": Image,
  "/admin/support": Headset,
  "/admin/settings": Settings,
  "/admin/staff": UserCog,
  "/admin/payments": CreditCard,
  "/admin/otp": Smartphone,
};

function iconFor(href: string): LucideIcon {
  if (NAV_ICONS[href]) {
    return NAV_ICONS[href];
  }
  const match = Object.keys(NAV_ICONS).find(
    (key) => key !== "/admin" && href.startsWith(key),
  );
  return match ? NAV_ICONS[match]! : Package;
}

function itemOrChildMatches(
  item: AdminNavItem,
  q: string,
  groupLabel: string,
): boolean {
  if (
    item.label.toLowerCase().includes(q) ||
    groupLabel.toLowerCase().includes(q)
  ) {
    return true;
  }
  return Boolean(
    item.children?.some((child) => itemOrChildMatches(child, q, groupLabel)),
  );
}

function pathMatchesBranch(item: AdminNavItem, pathname: string): boolean {
  if (isAdminNavActive(pathname, item.href) || pathname === item.href) {
    return true;
  }
  return Boolean(
    item.children?.some((child) => pathMatchesBranch(child, pathname)),
  );
}

function groupContainsPath(group: AdminNavGroup, pathname: string): boolean {
  return group.items.some((item) => pathMatchesBranch(item, pathname));
}

function NavLeaf({
  item,
  pathname,
  onNavigate,
  depth = 1,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate?: () => void;
  depth?: number;
}) {
  const active = isAdminNavActive(pathname, item.href);
  const nested = depth > 0;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md py-2 text-[13px] transition-colors",
        nested ? "pr-3" : "px-3",
        active
          ? "bg-white/15 font-medium"
          : "text-white/75 hover:bg-white/10 hover:text-white",
      )}
      style={{
        color: active ? "var(--admin-nav-text)" : undefined,
        ...(nested ? { paddingLeft: `${1.35 + depth * 0.7}rem` } : undefined),
      }}
    >
      {active ? (
        <span
          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-white"
          aria-hidden
        />
      ) : null}
      {nested ? (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            active ? "bg-white" : "bg-white/35",
          )}
          aria-hidden
        />
      ) : (
        createElement(iconFor(item.href), {
          className: "size-4 shrink-0 opacity-80",
          "aria-hidden": true,
        })
      )}
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}

function NavBranch({
  item,
  pathname,
  onNavigate,
  depth = 0,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate?: () => void;
  depth?: number;
}) {
  const children = item.children ?? [];
  const branchActive = pathMatchesBranch(item, pathname);
  const [open, setOpen] = useState(branchActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md py-2 pr-2 text-left text-[13px] transition-colors",
          depth === 0 ? "px-3" : "",
          branchActive
            ? "bg-white/12 font-medium"
            : "text-white/80 hover:bg-white/10 hover:text-white",
        )}
        style={{
          color: branchActive ? "var(--admin-nav-text)" : undefined,
          ...(depth > 0 ? { paddingLeft: `${1.35 + depth * 0.7}rem` } : undefined),
        }}
      >
        {depth === 0 ? (
          createElement(iconFor(item.href), {
            className: "size-4 shrink-0 opacity-80",
            "aria-hidden": true,
          })
        ) : (
          <span
            className="size-1.5 shrink-0 rounded-full bg-white/35"
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 opacity-60 transition-transform",
            open ? "rotate-180" : "",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <li key={`${child.href}-${child.label}`}>
              {child.children && child.children.length > 0 ? (
                <NavBranch
                  item={child}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  depth={depth + 1}
                />
              ) : (
                <NavLeaf
                  item={child}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  depth={depth + 1}
                />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AdminSidebar({
  onNavigate,
  className,
  theme,
}: {
  onNavigate?: () => void;
  className?: string;
  theme?: { bgColor: string | null; textColor: string | null };
}) {
  const pathname = usePathname();
  const session = useStaffSession();
  const homeHref = staffHomeHref(session);
  const [query, setQuery] = useState("");
  const [groupToggle, setGroupToggle] = useState<Record<string, boolean>>({});

  const filteredGroups = useMemo(() => {
    const allowed = filterAdminNavGroups(ADMIN_NAV_GROUPS, session);
    const q = query.trim().toLowerCase();
    if (!q) {
      return allowed;
    }
    return allowed
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          itemOrChildMatches(item, q, group.label),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query, session]);

  return (
    <nav
      aria-label="Admin"
      className={cn("flex h-full flex-col", className)}
      style={{
        backgroundColor: theme?.bgColor || ADMIN_SIDEBAR_BG,
        color: theme?.textColor || "#ffffff",
        // @ts-expect-error -- custom property
        "--admin-nav-text": theme?.textColor || "#ffffff",
      }}
    >
      <div className="border-b border-white/10 px-4 py-4">
        <Link
          href={homeHref}
          onClick={onNavigate}
          className="flex items-center gap-2.5"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/15 text-xs font-bold tracking-tight">
            TH
          </span>
          <span>
            <span className="block text-[15px] font-semibold leading-tight">
              Techno House
            </span>
            <span className="block text-[11px] text-white/55">Admin</span>
          </span>
        </Link>
      </div>

      <div className="px-3 py-3">
        <label className="relative block">
          <span className="sr-only">Search in menu</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu"
            className="w-full rounded-lg border border-white/10 bg-white/8 py-2 pr-3 pl-9 text-[13px] text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e1a24]"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-5">
        {query && filteredGroups.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-white/50">
            No menu items match &ldquo;{query}&rdquo;.
          </p>
        ) : null}
        <ul className="space-y-0.5">
          {filteredGroups.map((group) => {
            const expanded = query
              ? true
              : group.id in groupToggle
                ? groupToggle[group.id]
                : groupContainsPath(group, pathname);
            const Icon = GROUP_ICONS[group.id] ?? Package;
            const groupActive = groupContainsPath(group, pathname);
            return (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() =>
                    setGroupToggle(() => {
                      if (expanded) {
                        return { [group.id]: false };
                      }
                      // Accordion: opening one section closes the others so a
                      // 14-section menu doesn't turn into one long scroll.
                      const next: Record<string, boolean> = {};
                      for (const g of filteredGroups) {
                        next[g.id] = g.id === group.id;
                      }
                      return next;
                    })
                  }
                  aria-expanded={expanded}
                  className={cn(
                    "relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors",
                    groupActive
                      ? "bg-white/12"
                      : "text-white/85 hover:bg-white/8 hover:text-white",
                  )}
                  style={{ color: groupActive ? "var(--admin-nav-text)" : undefined }}
                >
                  {groupActive ? (
                    <span
                      className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-white"
                      aria-hidden
                    />
                  ) : null}
                  <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 opacity-50 transition-transform",
                      expanded ? "rotate-180" : "",
                    )}
                    aria-hidden
                  />
                </button>
                {expanded ? (
                  <ul className="mb-1 mt-0.5 space-y-0.5">
                    {group.items.map((item) => (
                      <li key={`${item.href}-${item.label}`}>
                        {item.children && item.children.length > 0 ? (
                          <NavBranch
                            item={item}
                            pathname={pathname}
                            onNavigate={onNavigate}
                          />
                        ) : (
                          <NavLeaf
                            item={item}
                            pathname={pathname}
                            onNavigate={onNavigate}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
