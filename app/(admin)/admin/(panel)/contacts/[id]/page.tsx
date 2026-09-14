import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminContactDetail } from "@/features/admin/support/admin-contact-detail";
import { getAdminContactById } from "@/lib/admin/load-support";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const contact = await getAdminContactById(id);
  return {
    title: contact ? contact.subject : "Contact not found",
  };
}

export default async function AdminContactDetailPage({ params }: Props) {
  const { id } = await params;
  const contact = await getAdminContactById(id);
  if (!contact) {
    notFound();
  }
  return <AdminContactDetail contact={contact} />;
}
