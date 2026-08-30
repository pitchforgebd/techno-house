import type { Metadata } from "next";
import { AccountDashboardView } from "@/features/account/account-dashboard-view";

export const metadata: Metadata = {
  title: "Account — Techno House",
};

export default function AccountPage() {
  return <AccountDashboardView />;
}
