import type { Metadata } from "next";
import { AdminBlogPostList } from "@/features/admin/marketing/admin-blog-post-list";
import { listAdminPosts } from "@/lib/content/blog";

export const metadata: Metadata = { title: "Blog posts" };

export default async function AdminBlogPage() {
  const posts = await listAdminPosts();
  return <AdminBlogPostList posts={posts} />;
}
