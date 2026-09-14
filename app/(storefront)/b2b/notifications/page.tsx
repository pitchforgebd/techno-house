import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountNotificationsView } from "@/features/account/account-notifications-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { listCustomerInbox } from "@/lib/notifications/inbox";

export const metadata: Metadata = {
  title: "Wholesale notifications — Techno House",
  robots: { index: false, follow: false },
};

export default async function B2BNotificationsPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/b2b/login");
  }
  const items = await listCustomerInbox(session.userId);
  return <AccountNotificationsView items={items} />;
}
