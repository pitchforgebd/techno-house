import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountShell } from "@/features/account/account-shell";
import { B2BOverviewView } from "@/features/b2b/b2b-overview-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getMyB2BProfile } from "@/lib/b2b/applications";
import { listCustomerOrders } from "@/lib/orders/customer-orders";

export const metadata: Metadata = {
  title: "Wholesale — Techno House",
  robots: { index: false, follow: false },
};

export default async function B2BOverviewPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/b2b/login");
  }
  const [profile, orders] = await Promise.all([
    getMyB2BProfile(session.userId),
    listCustomerOrders(),
  ]);

  // A retail customer who lands here has no wholesale panel to show.
  if (!profile) {
    return (
      <AccountShell title="Wholesale">
        <EmptyState
          title="No wholesale account yet"
          description="This sign-in is a retail customer account. Register your business to apply for wholesale pricing and order minimums."
          action={
            <Link href="/b2b/register" className={buttonClassName({ size: "sm" })}>
              Register for wholesale
            </Link>
          }
        />
      </AccountShell>
    );
  }

  return (
    <B2BOverviewView profile={profile} latestOrder={orders[0] ?? null} />
  );
}
