"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Download,
  Eye,
  MoreVertical,
  Printer,
  Send,
  Settings2,
} from "lucide-react";
import type { AdminOrder } from "@/lib/admin/orders-mock";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { sendOrderToSteadfastAction } from "@/features/admin/shipping/courier-actions";
import { SendToPathaoModal } from "@/features/admin/orders/send-to-pathao-modal";

/**
 * Invoice URL for an order.
 *
 * Takes the customer-facing order NUMBER, not the cuid. Every admin order URL
 * quotes the same reference the customer sees, so a staff member reading a
 * support thread can paste the number straight into the address bar.
 */
function invoiceHref(
  orderNumber: string,
  options?: { print?: boolean; thermal?: boolean },
): string {
  const query = new URLSearchParams();
  if (options?.print) {
    query.set("print", "1");
  }
  if (options?.thermal) {
    query.set("layout", "thermal");
  }
  const qs = query.toString();
  return `/admin/orders/${encodeURIComponent(orderNumber)}/invoice${qs ? `?${qs}` : ""}`;
}

function openInvoice(href: string) {
  const win = window.open(href, "_blank", "noopener,noreferrer");
  if (!win) {
    notifyError("Pop-up blocked — allow pop-ups, then try Print invoice again.");
  }
}

export function AdminOrderRowActions({
  order,
  onQuickManage,
  couriers = { pathao: false, steadfast: false },
}: {
  order: AdminOrder;
  onQuickManage: (order: AdminOrder) => void;
  couriers?: { pathao: boolean; steadfast: boolean };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pathaoOpen, setPathaoOpen] = useState(false);
  const [sendingSteadfast, startSteadfast] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const alreadySent = Boolean(order.carrierId);

  function sendToSteadfast() {
    startSteadfast(async () => {
      const result = await sendOrderToSteadfastAction({ orderId: order.id });
      if (!result.ok) {
        notifyError(result.reason);
        return;
      }
      notifySuccess(`Sent to Steadfast — tracking ${result.trackingCode}`);
      router.refresh();
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Options for ${order.number}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-200 text-text-muted hover:bg-surface-muted hover:text-text"
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-1 max-h-[22rem] min-w-[14.5rem] overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text hover:bg-surface-muted"
            onClick={() => {
              setOpen(false);
              onQuickManage(order);
            }}
          >
            <Settings2 className="size-4 text-text-muted" aria-hidden />
            Quick order management
          </button>
          <Link
            href={`/admin/orders/${encodeURIComponent(order.number)}`}
            className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            <Eye className="size-4 text-text-muted" aria-hidden />
            View order
          </Link>
          <Link
            href={invoiceHref(order.number)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            <Download className="size-4 text-text-muted" aria-hidden />
            View / download invoice
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text hover:bg-surface-muted"
            onClick={() => {
              setOpen(false);
              openInvoice(invoiceHref(order.number, { print: true }));
            }}
          >
            <Printer className="size-4 text-text-muted" aria-hidden />
            Print invoice
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text hover:bg-surface-muted"
            onClick={() => {
              setOpen(false);
              openInvoice(
                invoiceHref(order.number, { print: true, thermal: true }),
              );
            }}
          >
            <Printer className="size-4 text-text-muted" aria-hidden />
            Print thermal invoice
          </button>
          {alreadySent ? (
            <p className="border-t border-border px-3 py-2 text-caption text-text-muted">
              Sent to {order.carrierId} · {order.trackingCode || "no tracking code"}
            </p>
          ) : (
            <>
              {couriers.steadfast ? (
                <button
                  type="button"
                  disabled={sendingSteadfast}
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-body text-text hover:bg-surface-muted disabled:opacity-60"
                  onClick={() => {
                    setOpen(false);
                    sendToSteadfast();
                  }}
                >
                  <Send className="size-4 text-text-muted" aria-hidden />
                  {sendingSteadfast ? "Sending…" : "Send to Steadfast"}
                </button>
              ) : null}
              {couriers.pathao ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-body text-text hover:bg-surface-muted"
                  onClick={() => {
                    setOpen(false);
                    setPathaoOpen(true);
                  }}
                >
                  <Send className="size-4 text-text-muted" aria-hidden />
                  Send to Pathao
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {pathaoOpen ? (
        <SendToPathaoModal
          orderId={order.id}
          orderNumber={order.number}
          onClose={() => setPathaoOpen(false)}
          onSent={() => {
            setPathaoOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
