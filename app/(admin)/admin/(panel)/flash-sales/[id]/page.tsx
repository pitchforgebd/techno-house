import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminFlashSaleDetail } from "@/features/admin/marketing/admin-flash-sale-detail";
import {
  getFlashDealById,
  loadPromoCatalogProducts,
} from "@/lib/admin/load-promotions-offers";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const flashSale = await getFlashDealById(id);
  return {
    title: flashSale ? flashSale.title : "Flash deal not found",
  };
}

export default async function AdminFlashSaleDetailPage({ params }: Props) {
  const { id } = await params;
  const flashSale = await getFlashDealById(id);
  if (!flashSale) {
    notFound();
  }
  const catalog = await loadPromoCatalogProducts();
  const categories = Array.from(
    new Map(
      catalog.map((p) => [
        p.categorySlug,
        { slug: p.categorySlug, name: p.categoryName },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AdminFlashSaleDetail
      flashSale={flashSale}
      catalog={catalog}
      categories={categories}
    />
  );
}
