import type { Metadata } from "next";
import { WishlistView } from "@/features/lists/wishlist-view";
import { NO_INDEX } from "@/lib/seo/robots";

export const metadata: Metadata = {
  title: "Wishlist — Techno House",
  robots: NO_INDEX,
};

export default function WishlistPage() {
  return <WishlistView />;
}
