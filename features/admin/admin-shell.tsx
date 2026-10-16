"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { AdminTopbar } from "@/features/admin/admin-topbar";
import {
  useAdminLoginPath,
  useStaffSession,
} from "@/features/admin/staff-session-provider";
import { ADMIN_MAIN_BG } from "@/lib/admin/admin-chrome";
import { cn } from "@/lib/cn";

// Same `useSyncExternalStore` + module-scope listener-set shape as the cart
// payment-method preference (`features/cart/cart-provider.tsx`) — the
// established pattern in this codebase for a localStorage-backed value that
// must render identically on the server and on the client's first paint
// (here: the sidebar is real SSR content for a signed-in request, so an
// effect-based "sync after mount" would show a real flash/mismatch for an
// admin who already collapsed it).
const SIDEBAR_COLLAPSED_KEY = "th-admin-sidebar-collapsed";
const sidebarListeners = new Set<() => void>();

function emitSidebarCollapsed() {
  for (const listener of sidebarListeners) {
    listener();
  }
}

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSidebarCollapsed(next: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
  } catch {
    // Private browsing / storage disabled — the toggle still re-renders via
    // emitSidebarCollapsed() below, it just won't survive a reload.
  }
  emitSidebarCollapsed();
}

function subscribeSidebarCollapsed(listener: () => void) {
  sidebarListeners.add(listener);
  return () => {
    sidebarListeners.delete(listener);
  };
}

export function AdminShell({
  children,
  navTheme,
}: {
  children: ReactNode;
  navTheme?: { bgColor: string | null; textColor: string | null };
}) {
  const pathname = usePathname();
  const session = useStaffSession();
  const loginPath = useAdminLoginPath();
  const [navOpen, setNavOpen] = useState(false);
  // Desktop-only full hide (not the mobile Sheet above), remembered across
  // reloads.
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    readSidebarCollapsed,
    () => false,
  );

  function toggleSidebar() {
    writeSidebarCollapsed(!sidebarCollapsed);
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <EmptyState
          title="Staff sign-in required"
          description="Sign in with a staff account to open the admin panel."
          action={
            <Link
              href={`${loginPath}?next=${encodeURIComponent(pathname)}`}
              className={buttonClassName({ size: "sm" })}
            >
              Go to admin sign in
            </Link>
          }
        />
      </div>
    );
  }

  const invoiceDocument = /\/admin\/orders\/[^/]+\/invoice\/?$/.test(pathname);
  if (invoiceDocument) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: ADMIN_MAIN_BG }}
    >
      <aside
        className={cn(
          "hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out print:hidden lg:flex lg:flex-col",
          sidebarCollapsed ? "w-0" : "w-[17.5rem]",
        )}
      >
        {/* Fixed-width inner panel, independent of the <aside>'s own
            animated width — the content slides out of view as the outer
            box narrows, instead of every label/icon inside it squeezing
            and wrapping mid-transition. */}
        <div className="h-full w-[17.5rem]">
          <AdminSidebar theme={navTheme} />
        </div>
      </aside>

      <Sheet
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title="Admin navigation"
        side="left"
        closeLabel="Close navigation"
      >
        <AdminSidebar
          onNavigate={() => setNavOpen(false)}
          className="h-[calc(100vh-5rem)]"
          theme={navTheme}
        />
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <AdminTopbar
            onOpenNav={() => setNavOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
          />
        </div>
        <main
          id="admin-main"
          className="flex-1 overflow-x-auto p-4 sm:p-5 lg:p-6 print:p-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
