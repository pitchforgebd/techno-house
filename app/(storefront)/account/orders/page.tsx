import type { Metadata } from "next";
import { AccountOrdersView } from "@/features/account/account-orders-view";
import { listCustomerOrders } from "@/lib/orders/customer-orders";

export const metadata: Metadata = {
  title: "Orders — Techno House",
};

export default async function AccountOrdersPage() {
  const serverOrders = await listCustomerOrders();
  return <AccountOrdersView serverOrders={serverOrders} />;
}
