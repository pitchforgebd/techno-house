import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminBrandForm } from "@/features/admin/brands/admin-brand-form";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Add new brand",
};

export default async function AdminNewBrandPage() {
  const session = await requireStaffSession();
  if (!hasPermission(session, "brand.add")) {
    redirect("/admin/brands");
  }
  return <AdminBrandForm mode="create" canSave />;
}
