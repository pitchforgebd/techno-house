import type { Metadata } from "next";
import { AdminZoneRates } from "@/features/admin/shipping/admin-zone-rates";
import { listAdminZoneRates } from "@/lib/shipping/zone-rates";

export const metadata: Metadata = {
  title: "Shipping Rates",
};

export default async function AdminShippingRatesPage() {
  const zones = await listAdminZoneRates();
  return <AdminZoneRates zones={zones} />;
}
