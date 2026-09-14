import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountShell } from "@/features/account/account-shell";
import { B2BProfileView } from "@/features/b2b/b2b-profile-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getMyB2BProfile } from "@/lib/b2b/applications";

export const metadata: Metadata = {
  title: "Wholesale profile — Techno House",
  robots: { index: false, follow: false },
};

export default async function B2BProfilePage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/b2b/login");
  }
  const profile = await getMyB2BProfile(session.userId);

  // Same shell as the retail panel: a wholesale buyer keeps orders,
  // addresses and notifications, so the structure should not change under
  // them — only the entries and the content differ.
  return (
    <AccountShell title="Wholesale account">
      {profile ? (
        <B2BProfileView profile={profile} />
      ) : (
        <EmptyState
          title="No wholesale account yet"
          description="This sign-in is a retail customer account. Register your business to apply for wholesale pricing and order minimums."
          action={
            <Link href="/b2b/register" className={buttonClassName({ size: "sm" })}>
              Register for wholesale
            </Link>
          }
        />
      )}
    </AccountShell>
  );
}
