import type { Metadata } from "next";
import { AdminShippingConfiguration } from "@/features/admin/shipping/admin-shipping-configuration";

export const metadata: Metadata = {
  title: "Shipping Configuration",
};

export default function AdminShippingConfigurationPage() {
  return <AdminShippingConfiguration />;
}
