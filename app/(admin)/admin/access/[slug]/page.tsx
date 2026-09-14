import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AdminLoginForm } from "@/features/admin/admin-login-form";
import {
  canAccessAdminPath,
  staffHomeHref,
} from "@/lib/auth/admin-route-permissions";
import {
  getAdminLoginSlug,
  isValidAdminLoginSlug,
} from "@/lib/auth/admin-login-path";
import { getStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default async function AdminAccessLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { slug } = await params;
  if (!isValidAdminLoginSlug(slug) || slug !== getAdminLoginSlug()) {
    notFound();
  }

  const session = await getStaffSession();
  const query = await searchParams;
  if (session) {
    const next = query.next ?? "/admin";
    const safe =
      next.startsWith("/admin") &&
      !next.startsWith("//") &&
      !next.startsWith("/admin/login") &&
      !next.startsWith("/admin/access/")
        ? next
        : "/admin";
    redirect(
      canAccessAdminPath(safe, session.permissions)
        ? safe
        : staffHomeHref(session),
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% -10%, rgba(18,94,106,0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(184,97,44,0.12), transparent 45%), linear-gradient(180deg, #e8eef1 0%, #f4f6f8 40%, #eef2f5 100%)",
        }}
      />
      <div className="relative w-full">
        <Suspense
          fallback={
            <p className="mx-auto text-center text-body text-text-muted">
              Loading…
            </p>
          }
        >
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
