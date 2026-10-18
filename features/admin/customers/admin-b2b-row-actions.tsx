"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { BadgeCheck, MoreVertical, PauseCircle, PlayCircle, UserX } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  approveB2BAccountAction,
  setB2BAccountSuspendedAction,
} from "@/features/admin/customers/b2b-actions";
import { setCustomerBannedAction } from "@/features/admin/customers/customer-actions";
import type { AdminB2BListItem } from "@/lib/admin/b2b-accounts";

export function AdminB2bAccountRowActions({
  account,
}: {
  account: AdminB2BListItem;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
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

  function quickApprove() {
    setOpen(false);
    startTransition(async () => {
      // Discount/tier stay at whatever the account already has (0 by
      // default) — negotiated separately, set later from the account's own
      // "Wholesale terms" form rather than forced here.
      const result = await approveB2BAccountAction({ id: account.id });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not approve the account.");
        return;
      }
      notifySuccess(`Approved ${account.company}`);
      router.refresh();
    });
  }

  function toggleSuspend() {
    setOpen(false);
    const suspended = account.status !== "SUSPENDED";
    startTransition(async () => {
      const result = await setB2BAccountSuspendedAction({ id: account.id, suspended });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not update the account.");
        return;
      }
      notifySuccess(
        suspended ? `Suspended ${account.company}` : `Reactivated ${account.company}`,
      );
      router.refresh();
    });
  }

  function toggleBan() {
    setOpen(false);
    const banned = account.customer.status !== "BLOCKED";
    startTransition(async () => {
      const result = await setCustomerBannedAction({ id: account.customer.id, banned });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not update the customer.");
        return;
      }
      notifySuccess(
        banned
          ? `Banned ${account.customer.fullName}`
          : `Unbanned ${account.customer.fullName}`,
      );
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Options for ${account.company}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[14rem] rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
          {account.status === "PENDING" ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
              onClick={quickApprove}
            >
              <BadgeCheck className="size-4 text-neutral-400" aria-hidden />
              Approve
            </button>
          ) : account.status === "SUSPENDED" ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
              onClick={toggleSuspend}
            >
              <PlayCircle className="size-4 text-neutral-400" aria-hidden />
              Reactivate
            </button>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
              onClick={toggleSuspend}
            >
              <PauseCircle className="size-4 text-neutral-400" aria-hidden />
              Suspend
            </button>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
            onClick={toggleBan}
          >
            <UserX className="size-4 text-neutral-400" aria-hidden />
            {account.customer.status === "BLOCKED"
              ? "Unban this customer"
              : "Ban this customer"}
          </button>
          <Link
            href={`/admin/customers/b2b/${account.id}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
            onClick={() => setOpen(false)}
          >
            View details
          </Link>
        </div>
      ) : null}
    </div>
  );
}
