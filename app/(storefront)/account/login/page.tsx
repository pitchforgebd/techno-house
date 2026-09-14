import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountAuthShell } from "@/features/account/account-auth-shell";
import { LoginForm } from "@/features/account/login-form";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { safeReturnPath } from "@/lib/account/return-path";
import { getUsableOAuthProviders } from "@/lib/social/oauth-config";

export const metadata: Metadata = {
  title: "Sign in — Techno House",
  description: "Sign in to your Techno House customer account.",
  robots: { index: false, follow: false },
};

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
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
      title="Sign in"
      description="Use your Techno House customer account to track orders, save addresses, and check warranty coverage."
    >
      <Suspense
        fallback={<p className="text-caption text-text-muted">Loading…</p>}
      >
        <LoginForm usableProviders={usableProviders} socialError={params.error} />
      </Suspense>
    </AccountAuthShell>
  );
}
