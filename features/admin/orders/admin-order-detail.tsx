"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import { updateAdminOrderAction } from "@/features/admin/orders/order-actions";
import { OrderInvoiceQr } from "@/features/admin/orders/order-invoice-qr";
import {
  MOCK_DELIVERY_BOYS,
  type AdminOrder,
  type OrderFulfillmentStatus,
} from "@/lib/admin/orders-mock";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format/currency";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function parseDeliveryBoy(staffNotes: string | null | undefined): string {
  const match = staffNotes?.match(/^Delivery:\s*(.+)$/im);
  return match?.[1]?.trim() ?? "";
}

function fulfillmentLabel(status: OrderFulfillmentStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

export function AdminOrderDetail({
  order,
  qrDataUrl,
}: {
  order: AdminOrder;
  qrDataUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deliveryBoy, setDeliveryBoy] = useState(
    parseDeliveryBoy(order.staffNotes),
  );
  const [fulfillmentStatus, setFulfillmentStatus] = useState(
    order.fulfillmentStatus,
  );
  const [trackingCode, setTrackingCode] = useState(order.trackingCode ?? "");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">(
    order.paymentStatus === "paid" ? "paid" : "unpaid",
  );
  const paymentLocked = order.paymentStatus === "refunded";
  const [discountAmount, setDiscountAmount] = useState("");
  // The discount window closes the instant an order is first confirmed —
  // matches `updateAdminOrder`'s `justConfirmed` guard, which is the only
  // moment the backend will ever apply one.
  const canDiscount = !order.confirmedAt;

  const subtotal = order.lines.reduce(
    (sum, line) => sum + line.unitPrice.amount * line.quantity,
    0,
  );
  const total = order.total.amount;

  function saveOrder(nextStatus: OrderFulfillmentStatus = fulfillmentStatus) {
    startTransition(async () => {
      const result = await updateAdminOrderAction({
        id: order.id,
        fulfillmentStatus: nextStatus,
        trackingCode,
        staffNotes: order.staffNotes ?? "",
        deliveryBoy,
        ...(paymentLocked ? {} : { paymentStatus }),
        ...(canDiscount && discountAmount.trim() !== ""
          ? { discountAmount }
          : {}),
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess({
        title: "Order saved",
        description: `${order.number} · ${fulfillmentLabel(nextStatus)}`,
      });
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption font-medium text-primary">
            <Link href="/admin/orders" className="hover:underline">
              Orders
            </Link>
            <span className="text-text-muted"> / {order.number}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            Order details
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/orders/${encodeURIComponent(order.number)}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            View invoice
          </Link>
          <Link
            href={`/admin/orders/${encodeURIComponent(order.number)}/invoice?print=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#0f766e] px-3 text-sm font-medium text-white hover:bg-[#0d5f59]"
          >
            <Printer className="size-4" aria-hidden />
            Print invoice
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => saveOrder()}
            className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-neutral-600">
              Assign delivery boy
            </span>
            <Select
              value={deliveryBoy}
              onChange={(event) => setDeliveryBoy(event.target.value)}
              className={controlClass}
              disabled={pending}
            >
              <option value="">Select delivery…</option>
              {MOCK_DELIVERY_BOYS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-neutral-600">
              Payment status
            </span>
            {paymentLocked ? (
              <Input
                readOnly
                value="Refunded"
                className={cn(controlClass, "bg-neutral-50 text-neutral-600")}
              />
            ) : (
              <Select
                value={paymentStatus}
                onChange={(event) =>
                  setPaymentStatus(event.target.value as "paid" | "unpaid")
                }
                className={controlClass}
                disabled={pending}
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </Select>
            )}
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-neutral-600">
              Delivery status
            </span>
            <Select
              value={fulfillmentStatus}
              onChange={(event) => {
                const next = event.target.value as OrderFulfillmentStatus;
                setFulfillmentStatus(next);
                saveOrder(next);
              }}
              className={controlClass}
              disabled={pending}
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </label>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-600">
              Tracking code
            </span>
            <div className="flex">
              <Input
                value={trackingCode}
                onChange={(event) => setTrackingCode(event.target.value)}
                onBlur={() => saveOrder()}
                className={cn(controlClass, "rounded-r-none")}
                disabled={pending}
              />
              <button
                type="button"
                aria-label="Copy tracking code"
                className="inline-flex h-9 items-center justify-center rounded-r-md border border-l-0 border-neutral-200 bg-neutral-50 px-3 text-neutral-600 hover:bg-neutral-100"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(trackingCode);
                    notifySuccess("Tracking code copied");
                  } catch {
                    notifyError("Copy unavailable in this browser");
                  }
                }}
              >
                <Copy className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {canDiscount ? (
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <label className="block max-w-xs space-y-1">
              <span className="text-xs font-semibold text-neutral-600">
                Confirm with discount (৳, optional)
              </span>
              <Input
                type="number"
                min={0}
                step={1}
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                placeholder="0"
                className={controlClass}
                disabled={pending}
              />
            </label>
            <p className="mt-1 max-w-sm text-xs text-neutral-500">
              Applied the moment this order is confirmed (moved to
              Processing or further) — the confirmation email to the
              customer will show the reduced total.
            </p>
          </div>
        ) : order.adminDiscountAmount && order.adminDiscountAmount.amount > 0 ? (
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <span className="text-xs font-semibold text-neutral-600">
              Admin discount applied on confirm
            </span>
            <p className="text-sm font-semibold text-emerald-700">
              −{formatMoney(order.adminDiscountAmount)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <OrderInvoiceQr dataUrl={qrDataUrl} orderNumber={order.number} />
            <div className="space-y-1 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-900">
                {order.customerName}
              </p>
              <p>{order.customerEmail}</p>
              <p>{order.customerPhone}</p>
              <p>{order.shippingAddress}</p>
            </div>
            <div className="space-y-1 border-t border-dashed border-neutral-200 pt-4 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-900">Sold by:</p>
              <p>Techno House</p>
              <p>{order.shippingMethod}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm lg:text-right">
            <p>
              <span className="text-neutral-500">Order #:</span>{" "}
              <span className="font-semibold text-violet-600">
                {order.number}
              </span>
            </p>
            <p className="flex items-center gap-2 lg:justify-end">
              <span className="text-neutral-500">Order status:</span>
              <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                {fulfillmentLabel(fulfillmentStatus)}
              </span>
            </p>
            <p>
              <span className="text-neutral-500">Order date:</span>{" "}
              <span className="text-neutral-800">{order.placedAt}</span>
            </p>
            <p>
              <span className="text-neutral-500">Total amount:</span>{" "}
              <span className="font-semibold text-neutral-900">
                {formatMoney(order.total)}
              </span>
            </p>
            <p>
              <span className="text-neutral-500">Payment method:</span>{" "}
              <span className="text-neutral-800">{order.paymentMethod}</span>
            </p>
            <p>
              <span className="text-neutral-500">Additional info:</span>{" "}
              <span className="text-neutral-400">{order.notes ?? "—"}</span>
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <Table className="min-w-[40rem] text-caption">
            <TableHead>
              <TableRow className="border-b border-border bg-neutral-50 hover:bg-neutral-50">
                <TableHeader className="w-10 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  #
                </TableHeader>
                <TableHeader className="min-w-[14rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Description
                </TableHeader>
                <TableHeader className="w-14 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Qty
                </TableHeader>
                <TableHeader className="w-28 text-right text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Unit
                </TableHeader>
                <TableHeader className="w-28 text-right text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Total
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.lines.map((line, index) => (
                <TableRow key={line.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <p className="flex flex-wrap items-center gap-1.5 font-medium text-text">
                      {line.productName}
                      {line.buildBatchId ? (
                        <Badge tone="warranty">PC Build</Badge>
                      ) : null}
                      {line.wantsEmi ? (
                        <Badge tone="neutral">EMI requested</Badge>
                      ) : null}
                    </p>
                    {line.colorName ? (
                      <p className="flex items-center gap-1.5 text-text-muted">
                        {line.colorHex ? (
                          <span
                            aria-hidden
                            className="inline-block size-2.5 rounded-sm border border-black/10"
                            style={{ backgroundColor: line.colorHex }}
                          />
                        ) : null}
                        Colour: {line.colorName}
                      </p>
                    ) : null}
                    <p className="text-text-muted">{line.sku}</p>
                  </TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(line.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney({
                      amount: line.unitPrice.amount * line.quantity,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 flex flex-col items-end gap-1 text-sm">
          <p className="text-neutral-600">
            Sub total:{" "}
            <span className="font-medium text-neutral-900">
              {formatMoney({ amount: subtotal })}
            </span>
          </p>
          <p className="mt-1 text-xl font-bold text-neutral-900">
            Total: {formatMoney({ amount: total })}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Link
            href={`/admin/orders/${encodeURIComponent(order.number)}/invoice?print=1`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Print invoice"
            className="inline-flex size-10 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          >
            <Printer className="size-5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
