import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountOrderDetailView } from "@/features/account/account-order-detail-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getCustomerOrderByNumber } from "@/lib/orders/customer-orders";
import {
  listCustomerRefundReasons,
  listCustomerRefunds,
  remainingRefundableForOrder,
} from "@/lib/refunds/workflow";

export const metadata: Metadata = {
  title: "Order — Techno House",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ id: string }> };

/** Order detail inside the wholesale panel. Same order, same data. */
export default async function B2BOrderDetailPage({ params }: PageProps) {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/b2b/login");
  }
  const { id } = await params;
  const serverOrder = await getCustomerOrderByNumber(id);
  const refunds = serverOrder
    ? await listCustomerRefunds(serverOrder.number)
    : [];
  const refundReasons = await listCustomerRefundReasons();
  const remainingRefundable = serverOrder
    ? await remainingRefundableForOrder(serverOrder.number)
    : 0;
  return (
    <AccountOrderDetailView
      orderId={id}
      serverOrder={serverOrder}
      refunds={refunds}
      refundReasons={refundReasons}
      remainingRefundable={remainingRefundable}
    />
  );
}
