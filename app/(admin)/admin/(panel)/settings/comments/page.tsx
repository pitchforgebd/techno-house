import type { Metadata } from "next";
import { AdminCommentSystemSettings } from "@/features/admin/settings/admin-comment-system";
import { getAdminCommentSystemConfig } from "@/lib/comments/config";

export const metadata: Metadata = {
  title: "Social comments",
};

export default async function AdminCommentSystemPage() {
  const config = await getAdminCommentSystemConfig();
  return <AdminCommentSystemSettings config={config} />;
}
