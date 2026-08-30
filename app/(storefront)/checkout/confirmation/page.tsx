import type { Metadata } from "next";
import { CheckoutConfirmationView } from "@/features/checkout/checkout-confirmation-view";

export const metadata: Metadata = {
  title: "Order confirmation — Techno House",
};

export default function CheckoutConfirmationPage() {
  return <CheckoutConfirmationView />;
}
