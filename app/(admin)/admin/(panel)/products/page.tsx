import type { Metadata } from "next";
import { AdminProductList } from "@/features/admin/products/admin-product-list";
import { loadAdminProductList } from "@/lib/admin/load-products";
import {
  parseAdminProductListParams,
  type AdminProductSearchParams,
} from "@/lib/admin/product-list-params";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Products",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<AdminProductSearchParams>;
}) {
  const session = await requireStaffSession();
  const raw = await searchParams;
  const params = parseAdminProductListParams(raw);
  const data = await loadAdminProductList(params);
  return (
    <AdminProductList
      data={data}
      canAdd={hasPermission(session, "product.add")}
      canEdit={hasPermission(session, "product.edit")}
      canDelete={hasPermission(session, "product.delete")}
    />
  );
}
