import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCategoryForm } from "@/features/admin/categories/admin-category-form";
import {
  getAdminCategoryBySlug,
  loadAdminCategoryFormOptions,
} from "@/lib/admin/load-categories";
import { getCategorySeoHtml } from "@/lib/catalog/category-seo-content";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getAdminCategoryBySlug(slug);
  return {
    title: category ? `Edit ${category.name}` : "Category not found",
  };
}

export default async function AdminEditCategoryPage({ params }: Props) {
  const session = await requireStaffSession();
  const { slug } = await params;
  // Fetched on its own rather than through the shared category loader: that
  // loader reads every category for the list screen, and the guide copy can
  // run to tens of kilobytes per row.
  const [category, options, seoContentHtml] = await Promise.all([
    getAdminCategoryBySlug(slug),
    loadAdminCategoryFormOptions(),
    getCategorySeoHtml(slug),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <AdminCategoryForm
      mode="edit"
      category={category}
      seoContentHtml={seoContentHtml}
      categories={options.categories}
      canSave={hasPermission(session, "category.edit")}
    />
  );
}
