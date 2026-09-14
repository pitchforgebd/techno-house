import type { Metadata } from "next";
import { AdminShippingAreasPage } from "@/features/admin/shipping/admin-shipping-zones-areas";
import { listAdminShippingAreas } from "@/lib/shipping/locations";

export const metadata: Metadata = {
  title: "Shipping Areas",
};

export default async function Page() {
  const areas = await listAdminShippingAreas();
  return <AdminShippingAreasPage areas={areas} />;
}
