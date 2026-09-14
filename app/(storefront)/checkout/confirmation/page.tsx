import type { Metadata } from "next";
import { CheckoutConfirmationView } from "@/features/checkout/checkout-confirmation-view";
import { getCustomerOrderByNumber } from "@/lib/orders/customer-orders";

export const metadata: Metadata = {
  title: "Order confirmation — Techno House",
};

type PageProps = {
  searchParams: Promise<{ order?: string }>;
};

export default async function CheckoutConfirmationPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const number = typeof params.order === "string" ? params.order : "";
  const serverOrder = number ? await getCustomerOrderByNumber(number) : null;
  return <CheckoutConfirmationView serverOrder={serverOrder} />;
}
