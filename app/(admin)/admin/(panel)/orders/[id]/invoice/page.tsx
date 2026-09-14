import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminOrderInvoiceView } from "@/features/admin/orders/admin-order-invoice-view";
import { getAdminOrderInvoice } from "@/lib/orders/admin-invoice";
import {
  generateInvoiceQrDataUrl,
  invoiceQrSourceFromInvoice,
} from "@/lib/orders/invoice-qr";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string; layout?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const invoice = await getAdminOrderInvoice(id);
  return {
    title: invoice ? `Invoice ${invoice.number}` : "Invoice",
  };
}

export default async function AdminOrderInvoicePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = await searchParams;
  const invoice = await getAdminOrderInvoice(id);
  if (!invoice) {
    notFound();
  }
  const layout = query.layout === "thermal" ? "thermal" : "a4";
  const autoPrint = query.print === "1";
  const qrDataUrl = await generateInvoiceQrDataUrl(
    invoiceQrSourceFromInvoice(invoice),
    { size: layout === "thermal" ? 160 : 220 },
  );
  return (
    <AdminOrderInvoiceView
      invoice={invoice}
      qrDataUrl={qrDataUrl}
      layout={layout}
      autoPrint={autoPrint}
    />
  );
}
