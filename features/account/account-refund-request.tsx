"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requestRefundAction } from "@/features/account/refund-actions";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { formatMoney } from "@/lib/format/currency";
import type {
  CustomerRefundReasonView,
  CustomerRefundView,
} from "@/lib/refunds/workflow";

function statusLabel(status: CustomerRefundView["status"]): string {
  if (status === "approved") {
    return "Approved — waiting for payout";
  }
  if (status === "completed") {
    return "Refunded";
  }
  if (status === "rejected") {
    return "Rejected";
  }
  return "Requested";
}

export function AccountRefundRequest({
  orderNumber,
  remainingAmount,
  reasons,
  refunds,
}: {
  orderNumber: string;
  remainingAmount: number;
  reasons: CustomerRefundReasonView[];
  refunds: CustomerRefundView[];
}) {
  const router = useRouter();
  const open = refunds.some(
    (refund) => refund.status === "requested" || refund.status === "approved",
  );
  const canRequest = remainingAmount > 0 && !open;
  const [amount, setAmount] = useState(String(remainingAmount));
  const [reasonId, setReasonId] = useState(reasons[0]?.id ?? "");
  const [reasonText, setReasonText] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await requestRefundAction({
      orderNumber,
      amount: Number.parseInt(amount, 10),
      reasonId: reasonId || null,
      reasonText,
    });
    setPending(false);
    if (!result.ok) {
      notifyError({
        title: "Refund not requested",
        description: result.reason,
      });
      return;
    }
    notifySuccess({
      title: "Refund requested",
      description: result.code,
    });
    router.refresh();
  }

  return (
    <section
      className="rounded-md border border-border bg-surface p-4"
      aria-labelledby="order-refund-heading"
    >
      <h2
        id="order-refund-heading"
        className="text-label font-semibold text-text"
      >
        Refund
      </h2>
      {refunds.length > 0 ? (
        <ul className="mt-3 divide-y divide-border">
          {refunds.map((refund) => (
            <li key={refund.code} className="py-2 first:pt-0 last:pb-0">
              <p className="font-mono text-caption text-primary">
                {refund.code}
              </p>
              <p className="text-body text-text">
                {formatMoney({ amount: refund.amount })} ·{" "}
                {statusLabel(refund.status)}
              </p>
              <p className="text-caption text-text-muted">{refund.reason}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-caption text-text-muted">
          No refund has been requested for this order.
        </p>
      )}
      {canRequest ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => void onSubmit(event)}
        >
          <Alert
            tone="info"
            title="Staff must approve before money is returned"
          >
            <p className="text-caption">
              Requesting a refund does not pay it out. Remaining refundable:{" "}
              {formatMoney({ amount: remainingAmount })}.
            </p>
          </Alert>
          <Field label="Amount (BDT)" htmlFor="refund-amount">
            <Input
              id="refund-amount"
              type="number"
              min={1}
              max={remainingAmount}
              step={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </Field>
          {reasons.length > 0 ? (
            <Field label="Reason" htmlFor="refund-reason">
              <select
                id="refund-reason"
                className="h-11 w-full rounded-md border border-border bg-surface px-3 text-body"
                value={reasonId}
                onChange={(event) => setReasonId(event.target.value)}
              >
                {reasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.reason}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Notes (optional)" htmlFor="refund-notes">
            <Textarea
              id="refund-notes"
              value={reasonText}
              onChange={(event) => setReasonText(event.target.value)}
              maxLength={400}
            />
          </Field>
          <button
            type="submit"
            disabled={pending}
            className={buttonClassName({ size: "sm" })}
          >
            Request refund
          </button>
        </form>
      ) : remainingAmount <= 0 &&
        refunds.some((row) => row.status === "completed") ? (
        <p className="mt-3 text-caption text-text-muted">
          This order has no remaining refundable amount.
        </p>
      ) : null}
    </section>
  );
}
