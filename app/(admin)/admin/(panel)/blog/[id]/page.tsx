import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBlogPostForm } from "@/features/admin/marketing/admin-blog-post-form";
import { getAdminPost, listAdminCategories } from "@/lib/content/blog";
import { publicOrigin } from "@/lib/seo/public-origin";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getAdminPost(id);
  return {
    title: post ? post.title : "Post not found",
  };
}

export default async function AdminBlogPostPage({ params }: Props) {
  const { id } = await params;
  const [post, categories] = await Promise.all([
    getAdminPost(id),
    listAdminCategories(),
  ]);
  if (!post) {
    notFound();
  }
  return (
    <AdminBlogPostForm
      post={post}
      categories={categories}
      siteOrigin={publicOrigin()}
    />
  );
}
