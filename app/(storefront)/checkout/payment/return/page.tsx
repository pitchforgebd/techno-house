import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

  // The IPN/webhook confirmation is what actually marks an order paid, and
  // it usually lands before the browser gets redirected back here at all —
  // this reads that same real status fresh on every request, so when it's
  // already there, skip the "not confirmed yet" screen and go straight to
  // the real receipt instead of making the customer stare at a disclaimer
  // for a payment that already succeeded.
  if (order && order.paymentStatus === "paid") {
    redirect(`/checkout/confirmation?order=${encodeURIComponent(order.number)}`);
  }

  return <PaymentReturnView order={order} status={status} />;
}
