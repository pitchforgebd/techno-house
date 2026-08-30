import type { Metadata } from "next";
import { AccountTicketsView } from "@/features/account/account-tickets-view";

export const metadata: Metadata = {
  title: "Support — Techno House",
};

export default function AccountTicketsPage() {
  return <AccountTicketsView />;
}
