import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminCategoryForm } from "@/features/admin/categories/admin-category-form";
import { loadAdminCategoryFormOptions } from "@/lib/admin/load-categories";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Add new category",
};

export default async function AdminNewCategoryPage() {
  const session = await requireStaffSession();
  if (!hasPermission(session, "category.add")) {
    redirect("/admin/categories");
  }
  const options = await loadAdminCategoryFormOptions();
  return (
    <AdminCategoryForm mode="create" categories={options.categories} canSave />
  );
}
