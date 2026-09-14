import type { Metadata } from "next";
import { AdminBrandList } from "@/features/admin/brands/admin-brand-list";
import { loadAdminBrandList } from "@/lib/admin/load-brands";
import {
  parseAdminBrandListParams,
  type AdminBrandSearchParams,
} from "@/lib/admin/brand-list-params";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Brands",
};

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<AdminBrandSearchParams>;
}) {
  const session = await requireStaffSession();
  const raw = await searchParams;
  const params = parseAdminBrandListParams(raw);
  const data = await loadAdminBrandList(params);
  return (
    <AdminBrandList
      data={data}
      canAdd={hasPermission(session, "brand.add")}
      canDelete={hasPermission(session, "brand.delete")}
    />
  );
}
