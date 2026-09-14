import type { Metadata } from "next";
import { AccountNotificationsView } from "@/features/account/account-notifications-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { listCustomerInbox } from "@/lib/notifications/inbox";

export const metadata: Metadata = {
  title: "Notifications — Techno House",
};

export default async function AccountNotificationsPage() {
  const session = await getCustomerSession();
  const items = session ? await listCustomerInbox(session.userId) : [];
  return <AccountNotificationsView items={items} />;
}
