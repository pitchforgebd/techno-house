import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StaffSessionProvider } from "@/features/admin/staff-session-provider";
import { adminLoginPath } from "@/lib/auth/admin-login-path";
import { getStaffSession } from "@/lib/auth/staff-session";

/**
 * Every admin page requires a real staff session and reads live DB data —
 * there is nothing here safe or meaningful to statically prerender. Without
 * this, `next build` tries to prerender the whole admin tree at build time
 * (no session exists then, and middleware — the actual auth gate — doesn't
 * run during static generation), which floods Postgres with dozens of
 * simultaneous connections and fails with P2037 TooManyConnections. This is
 * the real fix for that long-standing build failure (Phase 14).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Admin — Techno House",
    template: "%s — Admin — Techno House",
  },
  robots: { index: false, follow: false },
};

export default async function AdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const staff = await getStaffSession();

  return (
    <StaffSessionProvider session={staff} loginPath={adminLoginPath()}>
      {children}
    </StaffSessionProvider>
  );
}
