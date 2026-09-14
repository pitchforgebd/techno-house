import type { Metadata } from "next";
import { AccountOrderDetailView } from "@/features/account/account-order-detail-view";
import { getCustomerOrderByNumber } from "@/lib/orders/customer-orders";
import {
  listCustomerRefundReasons,
  listCustomerRefunds,
  remainingRefundableForOrder,
} from "@/lib/refunds/workflow";

export const metadata: Metadata = {
  title: "Order — Techno House",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountOrderDetailPage({ params }: PageProps) {
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
