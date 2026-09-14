"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, MoreVertical, UserX, Wallet } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  adjustCustomerWalletAction,
  setCustomerBannedAction,
  setCustomerSuspiciousAction,
} from "@/features/admin/customers/customer-actions";
import type { AdminCustomer } from "@/lib/admin/customers-mock";

export function AdminCustomerRowActions({
  customer,
}: {
  customer: AdminCustomer;
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

  function toggleBan() {
    setOpen(false);
    const banned = customer.status !== "blocked";
    startTransition(async () => {
      const result = await setCustomerBannedAction({ id: customer.id, banned });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not update the customer.");
        return;
      }
      notifySuccess(banned ? `Banned ${customer.fullName}` : `Unbanned ${customer.fullName}`);
      router.refresh();
    });
  }

  function toggleSuspicious() {
    setOpen(false);
    const suspicious = !customer.suspicious;
    startTransition(async () => {
      const result = await setCustomerSuspiciousAction({
        id: customer.id,
        suspicious,
      });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not update the customer.");
        return;
      }
      notifySuccess(
        suspicious
          ? `Marked ${customer.fullName} as suspicious`
          : `Cleared suspicious flag for ${customer.fullName}`,
      );
      router.refresh();
    });
  }

  function walletRecharge() {
    setOpen(false);
    const raw = window.prompt(
      `Amount to add to ${customer.fullName}'s wallet (BDT). Use a negative number to deduct.`,
      "",
    );
    if (raw == null || raw.trim() === "") {
      return;
    }
    const amount = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(amount) || amount === 0) {
      notifyError("Enter a non-zero whole number.");
      return;
    }
    const reason = window.prompt(
      "Reason for this adjustment (optional, shown in the wallet ledger):",
      "",
    );
    startTransition(async () => {
      const result = await adjustCustomerWalletAction({
        id: customer.id,
        amount,
        reason: reason?.trim() || undefined,
      });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not adjust the wallet.");
        return;
      }
      notifySuccess(`Wallet updated. New balance: ${result.balance}`);
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Options for ${customer.fullName}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-md border border-blue-100 text-text-muted hover:bg-blue-50 hover:text-text"
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[14rem] rounded-md border border-border bg-surface py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text hover:bg-surface-muted"
            onClick={toggleBan}
          >
            <UserX className="size-4 text-text-muted" aria-hidden />
            {customer.status === "blocked"
              ? "Unban this customer"
              : "Ban this customer"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text hover:bg-surface-muted"
            onClick={toggleSuspicious}
          >
            <AlertTriangle className="size-4 text-text-muted" aria-hidden />
            {customer.suspicious
              ? "Clear suspicious mark"
              : "Mark as suspicious"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text hover:bg-surface-muted"
            onClick={walletRecharge}
          >
            <Wallet className="size-4 text-text-muted" aria-hidden />
            Wallet recharge…
          </button>
          <Link
            href={`/admin/customers/${customer.id}`}
            className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            View profile
          </Link>
        </div>
      ) : null}
    </div>
  );
}
