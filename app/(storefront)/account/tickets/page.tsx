import type { Metadata } from "next";
import { AccountTicketsView } from "@/features/account/account-tickets-view";
import { listCustomerTickets } from "@/lib/support/customer-tickets";

export const metadata: Metadata = {
  title: "Support — Techno House",
};

export default async function AccountTicketsPage() {
  const tickets = await listCustomerTickets();
  return <AccountTicketsView tickets={tickets} />;
}
