import type { Metadata } from "next";
import { WishlistView } from "@/features/lists/wishlist-view";

export const metadata: Metadata = {
  title: "Wishlist — Techno House",
};

export default function WishlistPage() {
  return <WishlistView />;
}
