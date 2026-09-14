import type { Metadata } from "next";
import { AdminChatWidgetSettings } from "@/features/admin/settings/admin-chat-widgets";
import { getAdminChatWidgetConfigs } from "@/lib/chat/config";

export const metadata: Metadata = {
  title: "Chat widgets",
};

export default async function AdminChatWidgetsPage() {
  const configs = await getAdminChatWidgetConfigs();
  return <AdminChatWidgetSettings configs={configs} />;
}
