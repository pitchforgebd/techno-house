import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountTicketsView } from "@/features/account/account-tickets-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { listCustomerTickets } from "@/lib/support/customer-tickets";

export const metadata: Metadata = {
  title: "Wholesale support — Techno House",
  robots: { index: false, follow: false },
};

export default async function B2BSupportPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/b2b/login");
  }
  const tickets = await listCustomerTickets();
  return <AccountTicketsView tickets={tickets} detailBase="/b2b/support" />;
}
