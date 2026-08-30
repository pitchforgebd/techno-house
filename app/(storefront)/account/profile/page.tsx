import type { Metadata } from "next";
import { AccountProfileView } from "@/features/account/account-profile-view";

export const metadata: Metadata = {
  title: "Profile — Techno House",
};

export default function AccountProfilePage() {
  return <AccountProfileView />;
}
