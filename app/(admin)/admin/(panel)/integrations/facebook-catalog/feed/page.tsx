import type { Metadata } from "next";
import { AdminFacebookCatalogProductsPage } from "@/features/admin/analytics/admin-facebook-catalog-products";
import { listFeedProducts } from "@/lib/analytics/feeds";
import { getAdminMetaConfig } from "@/lib/analytics/config";

export const metadata: Metadata = { title: "Facebook Catalog Products" };

export default async function Page() {
  const [products, meta] = await Promise.all([
    listFeedProducts(),
    getAdminMetaConfig(),
  ]);

  return (
    <AdminFacebookCatalogProductsPage
      products={products}
      feedLive={meta.isEnabled}
    />
  );
}
