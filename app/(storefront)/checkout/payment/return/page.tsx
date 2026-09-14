import type { Metadata } from "next";
import { PaymentReturnView } from "@/features/checkout/payment-return-view";
import { getCustomerOrderByNumber } from "@/lib/orders/customer-orders";
import { parsePaymentBrowserReturn } from "@/lib/payments/return";
import { NO_INDEX } from "@/lib/seo/robots";

export const metadata: Metadata = {
  title: "Payment return — Techno House",
  robots: NO_INDEX,
};

type PageProps = {
  searchParams: Promise<{ order?: string; status?: string }>;
};

export default async function PaymentReturnPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const number = typeof params.order === "string" ? params.order : "";
  const status = parsePaymentBrowserReturn(
    typeof params.status === "string" ? params.status : null,
  );
  const order = number ? await getCustomerOrderByNumber(number) : null;
  return <PaymentReturnView order={order} status={status} />;
}
