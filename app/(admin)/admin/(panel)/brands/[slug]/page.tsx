import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBrandForm } from "@/features/admin/brands/admin-brand-form";
import { getAdminBrandBySlug } from "@/lib/admin/load-brands";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getAdminBrandBySlug(slug);
  return {
    title: brand ? `Edit ${brand.name}` : "Brand not found",
  };
}

export default async function AdminEditBrandPage({ params }: Props) {
  const session = await requireStaffSession();
  const { slug } = await params;
  const brand = await getAdminBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  return (
    <AdminBrandForm
      mode="edit"
      brand={brand}
      canSave={hasPermission(session, "brand.edit")}
    />
  );
}
