import type { Metadata } from "next";
import { AccountCompareView } from "@/features/account/account-compare-view";

export const metadata: Metadata = {
  title: "Account compare — Techno House",
};

export default function AccountComparePage() {
  return <AccountCompareView />;
}
