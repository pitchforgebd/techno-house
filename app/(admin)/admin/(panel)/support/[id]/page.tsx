import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminTicketDetail } from "@/features/admin/support/admin-ticket-detail";
import { getAdminTicketById } from "@/lib/admin/load-support";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ticket = await getAdminTicketById(id);
  return {
    title: ticket ? ticket.number : "Ticket not found",
  };
}

export default async function AdminTicketDetailPage({ params }: Props) {
  const { id } = await params;
  const ticket = await getAdminTicketById(id);
  if (!ticket) {
    notFound();
  }
  return <AdminTicketDetail ticket={ticket} />;
}
