import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminProductForm } from "@/features/admin/products/admin-product-form";
import { getAdminProductFormOrder } from "@/lib/admin/product-form-layout";
import { loadAdminProductFormOptions } from "@/lib/admin/load-products";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Add new product",
};

export default async function AdminNewProductPage() {
  const session = await requireStaffSession();
  if (!hasPermission(session, "product.add")) {
    redirect("/admin/products");
  }
  const [options, sectionOrder] = await Promise.all([
    loadAdminProductFormOptions(),
    getAdminProductFormOrder(),
  ]);
  return (
    <AdminProductForm
      mode="create"
      categories={options.categories}
      brands={options.brands}
      attributes={options.attributes}
      units={options.units}
      warranties={options.warranties}
      notes={options.notes}
      labels={options.labels}
      canSave
      sectionOrder={sectionOrder}
    />
  );
}
