import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDealDetail } from "@/features/admin/marketing/admin-deal-detail";
import { getAdminDealById } from "@/lib/admin/load-marketing";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const deal = getAdminDealById(id);
  return {
    title: deal ? deal.name : "Deal not found",
  };
}

export default async function AdminDealDetailPage({ params }: Props) {
  const { id } = await params;
  const deal = getAdminDealById(id);
  if (!deal) {
    notFound();
  }
  return <AdminDealDetail deal={deal} />;
}
