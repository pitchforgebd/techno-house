import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountProfileView } from "@/features/account/account-profile-view";
import { getCustomerSession } from "@/lib/auth/customer-session";

export const metadata: Metadata = {
  title: "Login details — Techno House",
  robots: { index: false, follow: false },
};

/**
 * Sign-in details (name, email, phone, password) reached from the wholesale
 * panel. Same screen as the retail profile — there is one login per person —
 * but on a /b2b path so a trade buyer is not bounced into the customer panel.
 * Business details live on /b2b/profile instead.
 */
export default async function B2BLoginDetailsPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/b2b/login");
  }
  return <AccountProfileView title="Login details" />;
}
