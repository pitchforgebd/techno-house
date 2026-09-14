import type { Metadata } from "next";
import { AdminShippingMethods } from "@/features/admin/shipping/admin-shipping-methods";
import { listAdminShippingMethods } from "@/lib/shipping/methods";
import { listAdminCourierViews } from "@/lib/shipping/courier-settings";

export const metadata: Metadata = {
  title: "Select Shipping Method",
};

export default async function AdminShippingMethodsPage() {
  const [methods, couriers] = await Promise.all([
    listAdminShippingMethods(),
    listAdminCourierViews(),
  ]);
  return <AdminShippingMethods methods={methods} couriers={couriers} />;
}
