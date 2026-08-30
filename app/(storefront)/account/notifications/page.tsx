import type { Metadata } from "next";
import { AccountNotificationsView } from "@/features/account/account-notifications-view";

export const metadata: Metadata = {
  title: "Notifications — Techno House",
};

export default function AccountNotificationsPage() {
  return <AccountNotificationsView />;
}
