import type { Metadata } from "next";
import { AccountWishlistView } from "@/features/account/account-wishlist-view";

export const metadata: Metadata = {
  title: "Account wishlist — Techno House",
};

export default function AccountWishlistPage() {
  return <AccountWishlistView />;
}
