import type { Metadata } from "next";
import { AdminB2BPricing } from "@/features/admin/customers/admin-b2b-pricing";
import { listAdminB2BPricing } from "@/lib/admin/b2b-pricing";

export const metadata: Metadata = {
  title: "B2B product pricing",
};

export default async function AdminB2BPricingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const data = await listAdminB2BPricing({ q: params.q });
  return <AdminB2BPricing data={data} />;
}
