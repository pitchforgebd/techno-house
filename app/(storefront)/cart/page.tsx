import type { Metadata } from "next";
import { CartView } from "@/features/cart/cart-view";

export const metadata: Metadata = {
  title: "Cart — Techno House",
};

export default function CartPage() {
  return <CartView />;
}
