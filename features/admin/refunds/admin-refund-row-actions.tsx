"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Eye, MoreVertical, FileText } from "lucide-react";
import type { AdminRefund } from "@/lib/admin/orders-mock";

export function AdminRefundRowActions({
  refund,
  onViewDetails,
}: {
  refund: AdminRefund;
  onViewDetails: (refund: AdminRefund) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
        aria-label={`Options for ${refund.code}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-md border border-blue-100 text-text-muted hover:bg-blue-50 hover:text-text"
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-md border border-border bg-surface py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text hover:bg-surface-muted"
            onClick={() => {
              setOpen(false);
              onViewDetails(refund);
            }}
          >
            <FileText className="size-4 text-text-muted" aria-hidden />
            Refund details
          </button>
          <Link
            href={`/admin/orders/${encodeURIComponent(refund.orderNumber)}`}
            className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            <Eye className="size-4 text-text-muted" aria-hidden />
            View order
          </Link>
        </div>
      ) : null}
    </div>
  );
}
