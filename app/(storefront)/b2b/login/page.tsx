import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountAuthShell } from "@/features/account/account-auth-shell";
import { B2BLoginForm } from "@/features/b2b/b2b-login-form";
import { getCustomerSession } from "@/lib/auth/customer-session";

export const metadata: Metadata = {
  title: "Wholesale sign in — Techno House",
  description: "Sign in to your Techno House wholesale account.",
  robots: { index: false, follow: false },
};

export default async function B2BLoginPage() {
  const session = await getCustomerSession();
  if (session) {
    redirect("/b2b/profile");
  }

  return (
    <AccountAuthShell
      eyebrow="Wholesale"
      title="Wholesale sign in"
      description="Sign in to see your wholesale prices and per-product order minimums."
      note="Wholesale pricing appears only on approved accounts. If yours is still pending, you will see retail prices until it is verified."
    >
      <B2BLoginForm />
    </AccountAuthShell>
  );
}
