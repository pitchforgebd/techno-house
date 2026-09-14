import type { Metadata } from "next";
import { AdminProductConversations } from "@/features/admin/support/admin-product-conversations";
import { loadAdminQuestionList } from "@/lib/admin/load-questions";

export const metadata: Metadata = {
  title: "Product Conversations",
};

export default async function AdminProductConversationsPage() {
  const items = await loadAdminQuestionList();
  return <AdminProductConversations items={items} />;
}
