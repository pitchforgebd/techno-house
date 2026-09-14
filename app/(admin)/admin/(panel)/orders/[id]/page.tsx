import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminOrderDetail } from "@/features/admin/orders/admin-order-detail";
import { getAdminOrderById } from "@/lib/admin/load-orders";
import { getAdminOrderInvoice } from "@/lib/orders/admin-invoice";
import {
  generateInvoiceQrDataUrl,
  invoiceQrSourceFromInvoice,
  invoiceQrSourceFromOrder,
} from "@/lib/orders/invoice-qr";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = await getAdminOrderById(id);
  return {
    title: order ? `Order ${order.number}` : "Order not found",
  };
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getAdminOrderById(id);
  if (!order) {
    notFound();
  }
  const invoice = await getAdminOrderInvoice(id);
  const qrDataUrl = await generateInvoiceQrDataUrl(
    invoice
      ? invoiceQrSourceFromInvoice(invoice)
      : invoiceQrSourceFromOrder(order),
  );
  return <AdminOrderDetail order={order} qrDataUrl={qrDataUrl} />;
}
