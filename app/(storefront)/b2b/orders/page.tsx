import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountOrdersView } from "@/features/account/account-orders-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { listCustomerOrders } from "@/lib/orders/customer-orders";

export const metadata: Metadata = {
  title: "Wholesale orders — Techno House",
  robots: { index: false, follow: false },
};

/**
 * Same orders, reached from the wholesale panel.
 *
 * A trade buyer has one order history — these are not a separate set of
 * orders — but following "Orders" inside /b2b must keep them in the
 * wholesale panel rather than dropping them into the retail one.
 */
export default async function B2BOrdersPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/b2b/login");
  }
  const serverOrders = await listCustomerOrders();
  return (
    <AccountOrdersView serverOrders={serverOrders} detailBase="/b2b/orders" />
  );
}
