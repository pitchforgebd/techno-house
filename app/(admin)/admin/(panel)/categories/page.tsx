import type { Metadata } from "next";
import { AdminCategoryList } from "@/features/admin/categories/admin-category-list";
import { loadAdminCategoryList } from "@/lib/admin/load-categories";
import {
  parseAdminCategoryListParams,
  type AdminCategorySearchParams,
} from "@/lib/admin/category-list-params";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Categories",
};

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<AdminCategorySearchParams>;
}) {
  const session = await requireStaffSession();
  const raw = await searchParams;
  const params = parseAdminCategoryListParams(raw);
  const data = await loadAdminCategoryList(params);
  return (
    <AdminCategoryList
      data={data}
      canAdd={hasPermission(session, "category.add")}
      canDelete={hasPermission(session, "category.delete")}
    />
  );
}
