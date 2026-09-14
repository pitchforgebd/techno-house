import type { Metadata } from "next";
import { AdminBlogPostForm } from "@/features/admin/marketing/admin-blog-post-form";
import { listAdminCategories } from "@/lib/content/blog";
import { publicOrigin } from "@/lib/seo/public-origin";

export const metadata: Metadata = { title: "New blog post" };

export default async function AdminNewBlogPostPage() {
  const categories = await listAdminCategories();
  return (
    <AdminBlogPostForm
      post={null}
      categories={categories}
      isNew
      siteOrigin={publicOrigin()}
    />
  );
}
