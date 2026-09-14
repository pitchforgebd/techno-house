import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminMediaDetail } from "@/features/admin/media/admin-media-detail";
import { getAdminMediaById } from "@/lib/admin/load-media";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const asset = await getAdminMediaById(id);
  return {
    title: asset ? asset.filename : "Media not found",
  };
}

export default async function AdminMediaDetailPage({ params }: Props) {
  const { id } = await params;
  const asset = await getAdminMediaById(id);
  if (!asset) {
    notFound();
  }
  return <AdminMediaDetail asset={asset} />;
}
