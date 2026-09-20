"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  Menu,
  Plus,
  Globe,
  Palette,
  MessageSquare,
  LifeBuoy,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { ADMIN_DASHBOARD_TABS } from "@/lib/admin/admin-chrome";
import { AdminOrderAlertBell } from "@/features/admin/admin-order-alert-bell";
import { logoutStaffAction } from "@/features/admin/auth-actions";
import {
  useAdminLoginPath,
  useStaffSession,
} from "@/features/admin/staff-session-provider";
import { canAccessAdminPath } from "@/lib/auth/admin-route-permissions";
import { hasPermission } from "@/lib/auth/permission-check";
import type { StaffSessionView } from "@/lib/auth/staff-session";
import { cn } from "@/lib/cn";

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function initialsFor(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function AdminProfileMenu({
  session,
  loginPath,
}: {
  session: StaffSessionView;
  loginPath: string;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-neutral-50"
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-800">
          {initialsFor(session.fullName)}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-36 truncate text-xs font-semibold text-neutral-800">
            {session.fullName}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-neutral-400 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={panelId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-neutral-100 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-neutral-900">
              {session.fullName}
            </p>
            <p className="truncate text-xs text-neutral-500">
              {session.roleName} · {session.email}
            </p>
          </div>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            onClick={() => setOpen(false)}
          >
            <Globe className="size-4" aria-hidden />
            View storefront
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            onClick={() => {
              setOpen(false);
              startTransition(async () => {
                await logoutStaffAction();
                router.replace(loginPath);
                router.refresh();
              });
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AdminTopbar({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = usePathname();
  const session = useStaffSession();
  const loginPath = useAdminLoginPath();
  const date = todayLabel();

  const activeTab = ADMIN_DASHBOARD_TABS.find((tab) => tab.match(pathname));
  const permissions = session?.permissions ?? [];
  // `ADMIN_DASHBOARD_TABS` is a fixed list, unlike the sidebar (which is
  // already built from the permission-filtered nav tree) — filter it the
  // same way here, or a staff member without e.g. `orders.view_all` sees
  // (and can click) an "Orders" tab that isn't in their sidebar at all.
  const visibleTabs = ADMIN_DASHBOARD_TABS.filter((tab) =>
    canAccessAdminPath(tab.href, permissions),
  );
  const canViewDesignStudio = canAccessAdminPath(
    "/admin/design-studio",
    permissions,
  );
  const canViewSupport = canAccessAdminPath("/admin/support", permissions);
  const canViewContacts = canAccessAdminPath("/admin/contacts", permissions);
  const canAddProduct = hasPermission(session, "product.add");

  return (
    <header className="border-b border-neutral-200/80 bg-white">
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenNav}
        >
          <Menu className="size-5" aria-hidden />
        </button>

        <nav
          aria-label="Quick sections"
          className="hidden min-w-0 flex-1 items-center gap-1 md:flex"
        >
          {visibleTabs.map((tab) => {
            const active = activeTab?.href === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#3897f0]/10 text-[#2f86d8] shadow-[inset_0_0_0_1px_rgba(56,151,240,0.18)]"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {canAddProduct ? (
            <Link
              href="/admin/products/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0f766e] px-3 text-sm font-medium text-white shadow-sm hover:bg-[#0d5f59]"
            >
              <Plus className="size-4" aria-hidden />
              <span className="hidden sm:inline">Add new</span>
            </Link>
          ) : null}

          <span
            className="mx-2 hidden h-6 w-px bg-neutral-200 sm:block"
            aria-hidden
          />

          <div className="flex items-center gap-0.5">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title="View storefront"
              className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              aria-label="View storefront"
            >
              <Globe className="size-4" aria-hidden />
            </Link>
            {canViewDesignStudio ? (
              <Link
                href="/admin/design-studio"
                title="Design Studio"
                className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                aria-label="Design Studio"
              >
                <Palette className="size-4" aria-hidden />
              </Link>
            ) : null}
            <AdminOrderAlertBell />
            {canViewSupport ? (
              <Link
                href="/admin/support"
                title="Support"
                className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                aria-label="Support"
              >
                <LifeBuoy className="size-4" aria-hidden />
              </Link>
            ) : null}
            {canViewContacts ? (
              <Link
                href="/admin/contacts"
                title="Contacts"
                className="hidden size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 sm:inline-flex"
                aria-label="Contacts"
              >
                <MessageSquare className="size-4" aria-hidden />
              </Link>
            ) : null}
          </div>

          <span
            className="mx-2 hidden h-6 w-px bg-neutral-200 xl:block"
            aria-hidden
          />

          <span className="hidden rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-500 xl:inline">
            {date}
          </span>

          {session ? (
            <AdminProfileMenu session={session} loginPath={loginPath} />
          ) : null}
        </div>
      </div>

      <nav
        aria-label="Quick sections"
        className="flex gap-1 overflow-x-auto border-t border-neutral-100 px-3 py-1.5 md:hidden"
      >
        {visibleTabs.map((tab) => {
          const active = activeTab?.href === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
                active ? "bg-[#3897f0]/10 text-[#2f86d8]" : "text-neutral-500",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
