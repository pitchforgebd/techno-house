import type { Metadata } from "next";
import { AdminBlogCategoryList } from "@/features/admin/marketing/admin-blog-category-list";
import { listAdminCategories } from "@/lib/content/blog";

export const metadata: Metadata = { title: "Blog categories" };

export default async function AdminBlogCategoriesPage() {
  const categories = await listAdminCategories();
  return <AdminBlogCategoryList categories={categories} />;
}
