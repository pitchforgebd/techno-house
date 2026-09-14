"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import { updateAdminOrderAction } from "@/features/admin/orders/order-actions";
import {
  MOCK_DELIVERY_BOYS,
  type AdminOrder,
  type OrderFulfillmentStatus,
} from "@/lib/admin/orders-mock";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function parseDeliveryBoy(staffNotes: string | null | undefined): string {
  const match = staffNotes?.match(/^Delivery:\s*(.+)$/im);
  return match?.[1]?.trim() ?? "";
}

function notesWithoutDelivery(staffNotes: string | null | undefined): string {
  if (!staffNotes) {
    return "";
  }
  return staffNotes
    .split("\n")
    .filter((line) => !/^Delivery:\s*/i.test(line))
    .join("\n")
    .trim();
}

function AdminOrderQuickForm({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deliveryBoy, setDeliveryBoy] = useState(
    parseDeliveryBoy(order.staffNotes),
  );
  const [fulfillment, setFulfillment] = useState<OrderFulfillmentStatus>(
    order.fulfillmentStatus,
  );
  const [trackingCode, setTrackingCode] = useState(order.trackingCode ?? "");
  const [notes, setNotes] = useState(notesWithoutDelivery(order.staffNotes));
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">(
    order.paymentStatus === "paid" ? "paid" : "unpaid",
  );
  const paymentLocked = order.paymentStatus === "refunded";

  function handleConfirm() {
    startTransition(async () => {
      const result = await updateAdminOrderAction({
        id: order.id,
        fulfillmentStatus: fulfillment,
        trackingCode,
        staffNotes: notes,
        deliveryBoy,
        ...(paymentLocked ? {} : { paymentStatus }),
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess({
        title: "Order updated",
        description: `${order.number} saved`,
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <>
      <div className="space-y-4 px-5 py-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-neutral-800">
            Assign delivery boy
          </span>
          <Select
            value={deliveryBoy}
            onChange={(event) => setDeliveryBoy(event.target.value)}
            className={controlClass}
            disabled={pending}
          >
            <option value="">Select delivery boy</option>
            {MOCK_DELIVERY_BOYS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-neutral-800">
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

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-neutral-800">
            Delivery status
          </span>
          <Select
            value={fulfillment}
            onChange={(event) =>
              setFulfillment(event.target.value as OrderFulfillmentStatus)
            }
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

        <div className="space-y-1.5">
          <span className="text-sm font-semibold text-neutral-800">
            Tracking code
          </span>
          <div className="flex gap-0">
            <Input
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              className={cn(controlClass, "rounded-r-none")}
              disabled={pending}
            />
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-r-md border border-l-0 border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-700 hover:bg-neutral-100"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(trackingCode);
                  notifySuccess("Tracking code copied");
                } catch {
                  notifyError("Copy unavailable in this browser");
                }
              }}
            >
              <Copy className="size-3.5" aria-hidden />
              Copy
            </button>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-neutral-800">
            Staff notes
          </span>
          <Textarea
            rows={3}
            placeholder="Internal notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15"
            disabled={pending}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-md border border-neutral-200 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="rounded-md border border-neutral-200 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Confirm"}
        </button>
      </div>
    </>
  );
}

export function AdminOrderQuickModal({
  order,
  open,
  onClose,
}: {
  order: AdminOrder | null;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) {
      return;
    }
    if (open && !node.open) {
      node.showModal();
    }
    if (!open && node.open) {
      node.close();
    }
  }, [open]);

  if (!order) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        "w-full max-w-md rounded-lg border border-neutral-200 bg-white p-0 text-text shadow-xl",
        "backdrop:bg-black/40",
      )}
      onClose={onClose}
    >
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
          #{order.number}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <AdminOrderQuickForm key={order.id} order={order} onClose={onClose} />
    </dialog>
  );
}
