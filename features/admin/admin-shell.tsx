"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
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
      <aside className="hidden w-[17.5rem] shrink-0 print:hidden lg:flex lg:flex-col">
        <AdminSidebar theme={navTheme} />
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
          <AdminTopbar onOpenNav={() => setNavOpen(true)} />
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
