import type { Metadata } from "next";
import { AdminProductFormLayout } from "@/features/admin/catalog/admin-product-form-layout";
import { getAdminProductFormOrder } from "@/lib/admin/product-form-layout";

export const metadata: Metadata = {
  title: "Product form layout",
};

export default async function AdminProductFormLayoutPage() {
  const order = await getAdminProductFormOrder();
  return <AdminProductFormLayout initialOrder={order} />;
}
