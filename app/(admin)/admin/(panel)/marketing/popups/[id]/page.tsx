import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDynamicPopupForm } from "@/features/admin/marketing/admin-dynamic-popups";
import { getAdminPopup } from "@/lib/marketing/popups";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await getAdminPopup(id);
  return { title: row ? row.title : "Popup not found" };
}

export default async function AdminEditPopupPage({ params }: Props) {
  const { id } = await params;
  const row = await getAdminPopup(id);
  if (!row) notFound();
  return <AdminDynamicPopupForm initial={row} />;
}
