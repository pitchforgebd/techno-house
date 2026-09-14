import type { Metadata } from "next";
import { AdminPromotionList } from "@/features/admin/marketing/admin-promotion-list";
import { loadAdminPromotions } from "@/lib/admin/load-marketing";
import { parseMarketingListParams } from "@/lib/admin/marketing-list-params";

export const metadata: Metadata = {
  title: "Promotion campaigns",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPromotionCampaignsPage({
  searchParams,
}: PageProps) {
  const params = parseMarketingListParams(await searchParams);
  const data = await loadAdminPromotions(params);
  return <AdminPromotionList data={data} />;
}
