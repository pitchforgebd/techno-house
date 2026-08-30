import type { Metadata } from "next";
import { AccountReviewsView } from "@/features/account/account-reviews-view";

export const metadata: Metadata = {
  title: "Reviews — Techno House",
};

export default function AccountReviewsPage() {
  return <AccountReviewsView />;
}
