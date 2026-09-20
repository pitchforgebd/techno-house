import type { Metadata } from "next";
import { AccountBuildsView } from "@/features/account/account-builds-view";

export const metadata: Metadata = {
  title: "My builds — Techno House",
};

export default function AccountBuildsPage() {
  return <AccountBuildsView />;
}
