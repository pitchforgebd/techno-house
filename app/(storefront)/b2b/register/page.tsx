import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountAuthShell } from "@/features/account/account-auth-shell";
import { B2BRegisterForm } from "@/features/b2b/b2b-register-form";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getMyB2BAccount } from "@/lib/b2b/applications";

export const metadata: Metadata = {
  title: "Wholesale registration — Techno House",
  description: "Open a B2B wholesale account with Techno House.",
  robots: { index: false, follow: false },
};

export default async function B2BRegisterPage() {
  const session = await getCustomerSession();
  if (session) {
    const account = await getMyB2BAccount(session.userId);
    // Already signed in: an existing wholesale account goes to the profile,
    // otherwise the apply form on the profile page handles the upgrade.
    redirect(account ? "/b2b/profile" : "/b2b/profile");
  }

  return (
    <AccountAuthShell
      eyebrow="Wholesale"
      title="Open a wholesale account"
      description="Register your business for wholesale pricing. Use your own name, business phone, email, and NID — we verify each application before approving it."
      note="Wholesale prices and per-product order minimums stay hidden until an admin approves your account. You can shop at retail prices in the meantime."
    >
      <B2BRegisterForm />
    </AccountAuthShell>
  );
}
