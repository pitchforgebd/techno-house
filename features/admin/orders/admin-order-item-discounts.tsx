"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { applyOrderItemDiscountsAction } from "@/features/admin/orders/item-discount-actions";
import type { AdminOrderLine } from "@/lib/admin/orders-mock";
import { formatMoney } from "@/lib/format/currency";

type RowState = { percent: string; amount: string };

/**
 * Per-product discount, applied after the order is already placed (AD-379).
 * One-shot: once any line already carries a discount, this renders the
 * read-only "already applied" summary instead — see
 * `lib/orders/item-discounts.ts` for why (and where further adjustment
 * belongs: the Refunds tools).
 */
export function AdminOrderItemDiscounts({
  orderId,
  orderNumber,
  lines,
}: {
  orderId: string;
  orderNumber: string;
  lines: AdminOrderLine[];
}) {
  const alreadyApplied = lines.some((line) => (line.discountAmount ?? 0) > 0);
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      lines.map((line) => [line.id, { percent: "", amount: "" }]),
    ),
  );
  const [pending, startTransition] = useTransition();

  function applyPercent(lineId: string, lineTotal: number, percentValue: string) {
    const pct = Number.parseFloat(percentValue);
    const amount =
      Number.isFinite(pct) && pct >= 0 && pct <= 100
        ? String(Math.round(lineTotal * (pct / 100)))
        : (rows[lineId]?.amount ?? "");
    setRows((prev) => ({ ...prev, [lineId]: { percent: percentValue, amount } }));
  }

  function setAmount(lineId: string, value: string) {
    setRows((prev) => ({
      ...prev,
      [lineId]: { percent: prev[lineId]?.percent ?? "", amount: value },
    }));
  }

  const totalDiscount = lines.reduce((sum, line) => {
    const amount = Number.parseInt(rows[line.id]?.amount ?? "", 10);
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0);
  const originalTotal = lines.reduce(
    (sum, line) => sum + line.unitPrice.amount * line.quantity,
    0,
  );
  const percentOfTotal =
    originalTotal > 0 ? Math.round((totalDiscount / originalTotal) * 100) : 0;

  function submit() {
    const discounts = lines
      .map((line) => ({
        orderItemId: line.id,
        discountAmount: Number.parseInt(rows[line.id]?.amount ?? "", 10) || 0,
      }))
      .filter((entry) => entry.discountAmount > 0);

    if (discounts.length === 0) {
      notifyError("Enter at least one product discount.");
      return;
    }

    startTransition(async () => {
      const result = await applyOrderItemDiscountsAction({
        orderId,
        orderNumber,
        discounts,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess({
        title: "Discount applied — invoice emailed to customer",
        description: result.refundCode
          ? `Refund ${result.refundCode} processed for the difference.`
          : `${formatMoney({ amount: result.totalDiscount })} off — order was unpaid, nothing to refund.`,
      });
    });
  }

  if (alreadyApplied) {
    const applied = lines.reduce(
      (sum, line) => sum + (line.discountAmount ?? 0),
      0,
    );
    return (
      <div className="mt-4 border-t border-neutral-100 pt-4">
        <span className="text-xs font-semibold text-neutral-600">
          Item discounts already applied
        </span>
        <p className="text-sm font-semibold text-emerald-700">
          −{formatMoney({ amount: applied })}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Use the Refunds tools for any further adjustment to this order.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-neutral-100 pt-4">
      <span className="text-xs font-semibold text-neutral-600">
        Apply a discount per product (optional)
      </span>
      <p className="mt-1 max-w-md text-xs text-neutral-500">
        Type a % or a Taka amount for any product below, then apply. If the
        order is already paid, the discounted amount is refunded to the
        customer automatically. Either way, an updated invoice with each
        product&apos;s new price is emailed to the customer.
      </p>
      <div className="mt-3 space-y-2">
        {lines.map((line) => {
          const lineTotal = line.unitPrice.amount * line.quantity;
          const row = rows[line.id] ?? { percent: "", amount: "" };
          return (
            <div
              key={line.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-100 p-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">
                {line.productName}
                <span className="ml-1 text-xs tabular-nums text-neutral-500">
                  ({formatMoney({ amount: lineTotal })})
                </span>
              </span>
              <Input
                type="number"
                min={0}
                max={100}
                value={row.percent}
                placeholder="%"
                aria-label={`Discount percent for ${line.productName}`}
                onChange={(event) =>
                  applyPercent(line.id, lineTotal, event.target.value)
                }
                className="h-9 w-16 tabular-nums"
                disabled={pending}
              />
              <Input
                type="number"
                min={0}
                value={row.amount}
                placeholder="Taka"
                aria-label={`Discount amount for ${line.productName}`}
                onChange={(event) => setAmount(line.id, event.target.value)}
                className="h-9 w-24 tabular-nums"
                disabled={pending}
              />
            </div>
          );
        })}
      </div>
      {totalDiscount > 0 ? (
        <p className="mt-2 text-sm font-semibold text-emerald-700">
          Total discount: {formatMoney({ amount: totalDiscount })} (
          {percentOfTotal}%)
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="mt-3"
        onClick={submit}
        disabled={pending || totalDiscount <= 0}
      >
        {pending ? "Applying…" : "Apply discount & email invoice"}
      </Button>
    </div>
  );
}
