import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCustomAlertForm } from "@/features/admin/marketing/admin-custom-alerts";
import { getAdminAlert } from "@/lib/marketing/alerts";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await getAdminAlert(id);
  return { title: row ? "Edit Custom Alert" : "Alert not found" };
}

export default async function AdminEditAlertPage({ params }: Props) {
  const { id } = await params;
  const row = await getAdminAlert(id);
  if (!row) notFound();
  return <AdminCustomAlertForm initial={row} />;
}
