"use client";

import { useEffect } from "react";
import { OrderInvoiceQr } from "@/features/admin/orders/order-invoice-qr";
import { formatMoney } from "@/lib/format/currency";
import type { AdminInvoice } from "@/lib/orders/admin-invoice";
import { cn } from "@/lib/cn";

export function AdminOrderInvoiceView({
  invoice,
  qrDataUrl,
  layout = "a4",
  autoPrint = false,
}: {
  invoice: AdminInvoice;
  qrDataUrl: string;
  layout?: "a4" | "thermal";
  autoPrint?: boolean;
}) {
  useEffect(() => {
    if (!autoPrint) {
      return;
    }
    const timer = window.setTimeout(() => {
      window.print();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  const thermal = layout === "thermal";

  return (
    <div
      className={cn(
        "invoice-root min-h-screen bg-neutral-100 text-neutral-900 print:bg-white",
        thermal ? "p-3" : "p-4 sm:p-8",
      )}
    >
      <style>{`
        @media print {
          @page { margin: 12mm; size: ${thermal ? "80mm auto" : "A4"}; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .invoice-sheet {
            box-shadow: none !important;
            border: none !important;
            max-width: none !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-600">
          Invoice {invoice.number}
          {thermal ? " · thermal" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-[#0f766e] px-3 py-2 text-sm font-medium text-white hover:bg-[#0d5f59]"
            onClick={() => window.print()}
          >
            Print
          </button>
          <button
            type="button"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            onClick={() => window.close()}
          >
            Close
          </button>
        </div>
      </div>

      <article
        className={cn(
          "invoice-sheet mx-auto border border-neutral-200 bg-white shadow-sm",
          thermal
            ? "max-w-[20rem] px-3 py-4 text-[0.8rem]"
            : "max-w-3xl px-6 py-8 sm:px-10",
        )}
      >
        <header
          className={cn(
            "border-b border-neutral-200 pb-4",
            thermal ? "space-y-1 text-center" : "flex flex-wrap justify-between gap-4",
          )}
        >
          <div className={thermal ? "text-center" : undefined}>
            {invoice.store.logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- print-safe local/public logo
              <img
                src={invoice.store.logoSrc}
                alt=""
                className={cn(
                  "mb-2 w-auto object-contain",
                  thermal
                    ? "mx-auto h-10 max-w-[10rem]"
                    : "h-12 max-w-[14rem] object-left",
                )}
              />
            ) : null}
            <h1
              className={cn(
                "font-semibold tracking-tight text-neutral-900",
                thermal ? "text-base" : invoice.store.logoSrc ? "text-lg" : "text-2xl",
              )}
            >
              {invoice.store.storeName}
            </h1>
            {invoice.store.legalName &&
            invoice.store.legalName !== invoice.store.storeName ? (
              <p className="text-neutral-600">{invoice.store.legalName}</p>
            ) : null}
            <p className="text-neutral-600">
              {[invoice.store.address, invoice.store.city]
                .filter(Boolean)
                .join(", ")}
            </p>
            {invoice.store.phone ? (
              <p className="text-neutral-600">{invoice.store.phone}</p>
            ) : null}
            {invoice.store.supportEmail ? (
              <p className="text-neutral-600">{invoice.store.supportEmail}</p>
            ) : null}
            {invoice.store.taxId ? (
              <p className="text-neutral-600">Tax ID: {invoice.store.taxId}</p>
            ) : null}
          </div>
          <div className={cn(thermal ? "pt-2" : "text-right")}>
            <p
              className={cn(
                "font-semibold uppercase tracking-wide text-[#0f766e]",
                thermal ? "text-sm" : "text-lg",
              )}
            >
              Invoice
            </p>
            <p className="font-mono font-semibold text-neutral-900">
              {invoice.number}
            </p>
            <p className="text-neutral-600">{invoice.placedAt}</p>
            <div
              className={cn(
                "mt-3",
                thermal ? "flex justify-center" : "flex justify-end",
              )}
            >
              <OrderInvoiceQr
                dataUrl={qrDataUrl}
                orderNumber={invoice.number}
                size={thermal ? "sm" : "md"}
              />
            </div>
          </div>
        </header>

        <section
          className={cn(
            "grid gap-4 border-b border-neutral-200 py-4",
            thermal ? "grid-cols-1" : "sm:grid-cols-2",
          )}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Bill to
            </p>
            <p className="mt-1 font-medium text-neutral-900">
              {invoice.customerName}
            </p>
            <p className="text-neutral-700">{invoice.customerPhone}</p>
            <p className="text-neutral-700">{invoice.customerEmail}</p>
            <p className="mt-1 text-neutral-700">{invoice.shippingAddress}</p>
          </div>
          <div className={cn(!thermal && "sm:text-right")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Order
            </p>
            <p className="mt-1 text-neutral-800">Status: {invoice.status}</p>
            <p className="text-neutral-800">
              Payment: {invoice.paymentStatus} · {invoice.paymentMethod}
            </p>
            <p className="text-neutral-800">
              Shipping: {invoice.shippingMethod}
            </p>
            {invoice.trackingCode ? (
              <p className="text-neutral-800">
                Tracking: {invoice.trackingCode}
              </p>
            ) : null}
          </div>
        </section>

        <section className="py-4">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-300 text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-2 font-semibold">Item</th>
                <th className="py-2 px-1 text-right font-semibold">Qty</th>
                {!thermal ? (
                  <th className="py-2 px-1 text-right font-semibold">Price</th>
                ) : null}
                <th className="py-2 pl-1 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id} className="border-b border-neutral-100">
                  <td className="py-2.5 pr-2 align-top">
                    <p className="font-medium text-neutral-900">
                      {line.productName}
                    </p>
                    {line.colorName ? (
                      <p className="text-xs text-neutral-600">
                        Colour: {line.colorName}
                      </p>
                    ) : null}
                    <p className="text-xs text-neutral-500">{line.sku}</p>
                  </td>
                  <td className="py-2.5 px-1 text-right align-top tabular-nums">
                    {line.quantity}
                  </td>
                  {!thermal ? (
                    <td className="py-2.5 px-1 text-right align-top tabular-nums">
                      {formatMoney({ amount: line.unitAmount })}
                    </td>
                  ) : null}
                  <td className="py-2.5 pl-1 text-right align-top font-medium tabular-nums">
                    {formatMoney({ amount: line.totalAmount })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section
          className={cn(
            "ml-auto space-y-1",
            thermal ? "w-full" : "w-full max-w-xs",
          )}
        >
          <div className="flex justify-between text-neutral-700">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatMoney({ amount: invoice.subtotalAmount })}
            </span>
          </div>
          {invoice.discountAmount > 0 ? (
            <div className="flex justify-between text-neutral-700">
              <span>Discount</span>
              <span className="tabular-nums">
                −{formatMoney({ amount: invoice.discountAmount })}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between text-neutral-700">
            <span>Shipping</span>
            <span className="tabular-nums">
              {formatMoney({ amount: invoice.shippingAmount })}
            </span>
          </div>
          {invoice.serviceChargeAmount > 0 ? (
            <div className="flex justify-between text-neutral-700">
              <span>Service charge</span>
              <span className="tabular-nums">
                {formatMoney({ amount: invoice.serviceChargeAmount })}
              </span>
            </div>
          ) : null}
          {invoice.taxAmount > 0 ? (
            <div className="flex justify-between text-neutral-700">
              <span>Tax / VAT</span>
              <span className="tabular-nums">
                {formatMoney({ amount: invoice.taxAmount })}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-semibold text-neutral-900">
            <span>Total</span>
            <span className="tabular-nums">
              {formatMoney({ amount: invoice.totalAmount })}
            </span>
          </div>
        </section>

        {invoice.notes ? (
          <p className="mt-6 border-t border-dashed border-neutral-200 pt-3 text-neutral-600">
            Note: {invoice.notes}
          </p>
        ) : null}

        <p className="mt-8 text-center text-xs text-neutral-500">
          Thank you for shopping with {invoice.store.storeName}.
        </p>
      </article>
    </div>
  );
}
