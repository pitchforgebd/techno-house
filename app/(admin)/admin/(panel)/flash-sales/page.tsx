import type { Metadata } from "next";
import { AdminFlashSaleList } from "@/features/admin/marketing/admin-flash-sale-list";
import {
  loadFlashDealList,
  parseFlashDealTab,
} from "@/lib/admin/load-promotions-offers";
import type { MarketingSearchParams } from "@/lib/admin/marketing-list-params";

export const metadata: Metadata = {
  title: "Flash deals",
};

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

export default async function AdminFlashSalesPage({
  searchParams,
}: {
  searchParams: Promise<MarketingSearchParams>;
}) {
  const raw = await searchParams;
  const data = await loadFlashDealList({
    q: first(raw.q).trim().slice(0, 120),
    tab: parseFlashDealTab(first(raw.tab).trim()),
  });
  return <AdminFlashSaleList data={data} />;
}
