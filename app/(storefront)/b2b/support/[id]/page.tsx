import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountTicketDetailView } from "@/features/account/account-ticket-detail-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getCustomerTicketById } from "@/lib/support/customer-tickets";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const ticket = await getCustomerTicketById(id);
  return {
    title: ticket ? `${ticket.number} — Support` : "Ticket — Techno House",
    robots: { index: false, follow: false },
  };
}

/** Ticket detail inside the wholesale panel. */
export default async function B2BTicketDetailPage({ params }: PageProps) {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/b2b/login");
  }
  const { id } = await params;
  const ticket = await getCustomerTicketById(id);
  return <AccountTicketDetailView ticket={ticket} />;
}
