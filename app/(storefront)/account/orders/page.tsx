import type { Metadata } from "next";
import { AccountOrdersView } from "@/features/account/account-orders-view";

export const metadata: Metadata = {
  title: "Orders — Techno House",
};

export default function AccountOrdersPage() {
  return <AccountOrdersView />;
}
