"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  approveRefundAction,
  completeRefundAction,
  rejectRefundAction,
} from "@/features/admin/refunds/refund-actions";
import type { AdminRefund } from "@/lib/admin/orders-mock";
import { refundChannelLabel } from "@/lib/admin/refund-list-params";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format/currency";

function statusBadgeClass(badge?: "rejected" | "approved" | "pending") {
  if (badge === "rejected") {
    return "bg-rose-500 text-white";
  }
  if (badge === "approved") {
    return "bg-emerald-500 text-white";
  }
  if (badge === "pending") {
    return "bg-violet-500 text-white";
  }
  return "";
}

export function AdminRefundDetailModal({
  refund,
  open,
  onClose,
  canProcess = false,
}: {
  refund: AdminRefund | null;
  open: boolean;
  onClose: () => void;
  canProcess?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);

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

  if (!refund) {
    return null;
  }
  const refundId = refund.id;

  const canApprove = canProcess && refund.status === "requested";
  const canComplete = canProcess && refund.status === "approved";
  const canReject =
    canProcess &&
    (refund.status === "requested" || refund.status === "approved");

  async function run(
    action: (
      id: string,
    ) => Promise<{ ok: true; code: string } | { ok: false; reason: string }>,
    okTitle: string,
  ) {
    setPending(true);
    const result = await action(refundId);
    setPending(false);
    if (!result.ok) {
      notifyError({ title: "Refund not updated", description: result.reason });
      return;
    }
    notifySuccess({ title: okTitle, description: result.code });
    router.refresh();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        "w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-0 text-text shadow-xl",
        "backdrop:bg-black/40",
      )}
      onClose={onClose}
    >
      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-800 px-5 py-3.5 text-white">
        <h2 id={titleId} className="text-base font-semibold">
          Refund request view
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
        <div className="flex items-start gap-3 border-b border-neutral-100 pb-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded border border-neutral-100 bg-neutral-50 text-[0.65rem] font-semibold text-neutral-400">
            TH
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-neutral-900">
              {refund.productName}
            </p>
            <p className="text-sm text-neutral-500">#{refund.orderNumber}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold tabular-nums text-neutral-900">
              {formatMoney(refund.amount)}
            </p>
            <span className="mt-1 inline-flex rounded-full border border-neutral-200 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-neutral-600">
              {refundChannelLabel(refund.paymentChannel)}
            </span>
          </div>
        </div>

        <ul className="mt-4 space-y-4">
          {refund.timeline.map((event) => (
            <li
              key={event.id}
              className="flex gap-3 border-b border-dashed border-neutral-100 pb-4 last:border-0"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                {event.actorName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="font-semibold text-neutral-900">
                    {event.actorName}
                  </p>
                  <p className="text-xs text-neutral-400">{event.at}</p>
                </div>
                <p className="mt-1 text-sm text-neutral-700">{event.message}</p>
                {event.statusBadge ? (
                  <span
                    className={cn(
                      "mt-2 inline-flex rounded px-2 py-0.5 text-xs font-semibold capitalize",
                      statusBadgeClass(event.statusBadge),
                    )}
                  >
                    {event.statusBadge}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {canApprove || canComplete || canReject ? (
          <div className="mt-2 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
            {canApprove ? (
              <button
                type="button"
                disabled={pending}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                onClick={() => void run(approveRefundAction, "Refund approved")}
              >
                Approve
              </button>
            ) : null}
            {canComplete ? (
              <button
                type="button"
                disabled={pending}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                onClick={() =>
                  void run(completeRefundAction, "Refund paid out")
                }
              >
                Refund now
              </button>
            ) : null}
            {canReject ? (
              <button
                type="button"
                disabled={pending}
                className="rounded-md bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                onClick={() => void run(rejectRefundAction, "Refund rejected")}
              >
                Reject refund
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
