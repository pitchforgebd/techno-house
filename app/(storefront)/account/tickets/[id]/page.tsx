import type { Metadata } from "next";
import { AccountTicketDetailView } from "@/features/account/account-ticket-detail-view";
import { getCustomerTicketById } from "@/lib/support/customer-tickets";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const ticket = await getCustomerTicketById(id);
  return {
    title: ticket ? `${ticket.number} — Support` : "Ticket — Techno House",
  };
}

export default async function AccountTicketDetailPage({ params }: PageProps) {
  const { id } = await params;
  const ticket = await getCustomerTicketById(id);
  return <AccountTicketDetailView ticket={ticket} />;
}
