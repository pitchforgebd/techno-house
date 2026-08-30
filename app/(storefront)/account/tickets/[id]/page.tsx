import type { Metadata } from "next";
import { AccountTicketDetailView } from "@/features/account/account-ticket-detail-view";

export const metadata: Metadata = {
  title: "Ticket — Techno House",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountTicketDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AccountTicketDetailView ticketId={id} />;
}
