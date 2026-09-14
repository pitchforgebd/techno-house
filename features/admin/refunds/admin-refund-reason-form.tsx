"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { createRefundReasonAction } from "@/features/admin/refunds/refund-settings-actions";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";

export function AdminRefundReasonForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    // Client-side checks are a convenience only — `createRefundReasonAction`
    // revalidates everything server-side.
    if (!type) {
      setError("Select a type.");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason.");
      return;
    }
    if (reason.trim().length > 120) {
      setError("Reason must be 120 characters or fewer.");
      return;
    }

    startTransition(async () => {
      const result = await createRefundReasonAction({
        type: type as "customer" | "admin_reject",
        reason: reason.trim(),
      });
      if (!result.ok) {
        setError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess({
        title: "Refund reason created",
        description: reason.trim(),
      });
      router.push("/admin/refunds/reasons");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <p className="text-caption font-medium text-primary">
          <Link href="/admin/refunds/reasons" className="hover:underline">
            Refund reasons
          </Link>
          <span className="text-text-muted"> / New</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-800">
          Add refund reason
        </h1>
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <AdminFormCard title="Refund reason information">
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="reason-type" required>
            Type
          </AdminFormLabel>
          <Select
            id="reason-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={adminFormControlClass}
          >
            <option value="">Select type</option>
            <option value="customer">Customer refund reason</option>
            <option value="admin_reject">Admin reject refund reason</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="reason-text" required>
            Reason (max 120 character)
          </AdminFormLabel>
          <Textarea
            id="reason-text"
            rows={4}
            maxLength={120}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15"
          />
          <p className="text-xs text-neutral-500">{reason.length}/120</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/admin/refunds/reasons"
            className={buttonClassName({
              variant: "ghost",
              className: "border border-neutral-200",
            })}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={pending}
            className="min-h-10 bg-[#3897f0] px-6 hover:bg-[#2f86d8]"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </AdminFormCard>
    </form>
  );
}
