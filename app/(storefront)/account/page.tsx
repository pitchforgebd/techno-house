import type { Metadata } from "next";
import { AccountDashboardView } from "@/features/account/account-dashboard-view";
import { listCustomerOrders } from "@/lib/orders/customer-orders";
import { usesOrderDatabase } from "@/lib/orders/create-order";

export const metadata: Metadata = {
  title: "Account — Techno House",
};

export default async function AccountPage() {
  const persist = usesOrderDatabase();
  const latestOrder = persist
    ? ((await listCustomerOrders())[0] ?? null)
    : null;
  return <AccountDashboardView persist={persist} latestOrder={latestOrder} />;
}
