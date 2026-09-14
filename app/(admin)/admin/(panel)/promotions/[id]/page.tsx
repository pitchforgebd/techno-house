import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPromotionDetail } from "@/features/admin/marketing/admin-promotion-detail";
import { getAdminPromotionById } from "@/lib/admin/load-marketing";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const promotion = await getAdminPromotionById(id);
  return {
    title: promotion ? promotion.name : "Promotion not found",
  };
}

export default async function AdminPromotionDetailPage({ params }: Props) {
  const { id } = await params;
  const promotion = await getAdminPromotionById(id);
  if (!promotion) {
    notFound();
  }
  return <AdminPromotionDetail promotion={promotion} />;
}
