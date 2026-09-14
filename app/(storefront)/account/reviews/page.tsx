import type { Metadata } from "next";
import { AccountReviewsView } from "@/features/account/account-reviews-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { listCustomerReviews } from "@/lib/catalog/customer-reviews";

export const metadata: Metadata = {
  title: "Reviews — Techno House",
};

export default async function AccountReviewsPage() {
  const session = await getCustomerSession();
  const reviews = session ? await listCustomerReviews(session.userId) : [];
  return <AccountReviewsView reviews={reviews} />;
}
