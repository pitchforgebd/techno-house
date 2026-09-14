import type { Metadata } from "next";
import { AdminShippingZonesPage } from "@/features/admin/shipping/admin-shipping-zones-areas";
import { listAdminShippingZones } from "@/lib/shipping/locations";

export const metadata: Metadata = {
  title: "Shipping Zones",
};

export default async function Page() {
  const zones = await listAdminShippingZones();
  return <AdminShippingZonesPage zones={zones} />;
}
