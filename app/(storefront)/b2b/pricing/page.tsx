import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountShell } from "@/features/account/account-shell";
import { B2BPriceListView } from "@/features/b2b/b2b-price-list-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getMyB2BPriceList } from "@/lib/b2b/price-list";

export const metadata: Metadata = {
  title: "My price list — Techno House",
  robots: { index: false, follow: false },
};

export default async function B2BPricingPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/b2b/login");
  }
  const list = await getMyB2BPriceList();

  if (!list) {
    return (
      <AccountShell title="My price list">
        <EmptyState
          title="No wholesale pricing yet"
          description="Your price list appears once an admin verifies the wholesale account. Retail prices apply until then."
          action={
            <Link
              href="/b2b/profile"
              className={buttonClassName({ size: "sm" })}
            >
              Check account status
            </Link>
          }
        />
      </AccountShell>
    );
  }

  return (
    <AccountShell title="My price list">
      <B2BPriceListView list={list} />
    </AccountShell>
  );
}
