import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountAuthShell } from "@/features/account/account-auth-shell";
import { RegisterForm } from "@/features/account/register-form";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { safeReturnPath } from "@/lib/account/return-path";
import { getUsableOAuthProviders } from "@/lib/social/oauth-config";

export const metadata: Metadata = {
  title: "Create account — Techno House",
  description: "Create a Techno House customer account.",
  robots: { index: false, follow: false },
};

export default async function AccountRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getCustomerSession();
  const params = await searchParams;
  if (session) {
    redirect(safeReturnPath(params.next ?? null, "/account"));
  }
  const usableProviders = await getUsableOAuthProviders();

  return (
    <AccountAuthShell
      eyebrow="Customer account"
      title="Create your account"
      description="Register with an email and password to track orders, keep a wishlist, and check out faster."
    >
      <Suspense
        fallback={<p className="text-caption text-text-muted">Loading…</p>}
      >
        <RegisterForm usableProviders={usableProviders} />
      </Suspense>
    </AccountAuthShell>
  );
}
