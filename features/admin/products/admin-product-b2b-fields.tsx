"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { saveB2BProductTermsAction } from "@/features/admin/customers/b2b-pricing-actions";
import {
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import { computeWholesalePrice } from "@/lib/b2b/pricing";

export type AdminProductB2BTerms = {
  priceAmount: number;
  minQuantity: number;
  isActive: boolean;
};

/**
 * Per-product B2B/wholesale pricing — an instant-save widget (its own Save
 * button, independent server action) rather than part of the big product
 * submit, since it writes to a separate `B2BProductPrice` row. Only shown in
 * edit mode: a brand-new product has no id for that row to key off yet.
 *
 * The toggle is the real on/off switch (`B2BProductPrice.isActive`) — while
 * on, this product's own wholesale price applies to a verified B2B buyer
 * (overriding the account's flat discount); turning it off keeps the
 * stored price for next time instead of deleting it, and the account's
 * flat discount applies here meanwhile. The storefront's register/sign-in
 * prompt itself is universal and unaffected by this toggle.
 */
export function AdminProductB2BFields({
  productId,
  retailAmount,
  initial,
}: {
  productId: string;
  retailAmount: number;
  initial: AdminProductB2BTerms | null;
}) {
  const [enabled, setEnabled] = useState(initial?.isActive ?? false);
  const [price, setPrice] = useState(
    initial ? String(initial.priceAmount) : "",
  );
  const [percent, setPercent] = useState("");
  const [minQty, setMinQty] = useState(String(initial?.minQuantity ?? 1));
  const [pending, startTransition] = useTransition();

  // % is a one-way convenience that writes into the price field — the price
  // is what actually persists, so typing it directly still works.
  function applyPercent(next: string) {
    setPercent(next);
    const pct = Number.parseFloat(next);
    if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
      setPrice(
        String(
          computeWholesalePrice({ amount: retailAmount, currency: "BDT" }, pct)
            .amount,
        ),
      );
    }
  }

  const priceAmount = Number.parseInt(price, 10) || 0;
  const savings = retailAmount - priceAmount;
  const savedPercent =
    priceAmount > 0 && savings > 0
      ? Math.round((savings / retailAmount) * 100)
      : null;

  function save() {
    startTransition(async () => {
      const result = await saveB2BProductTermsAction({
        productId,
        priceAmount,
        minQuantity: Number.parseInt(minQty, 10) || 1,
        enabled,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        enabled ? "B2B pricing enabled" : "B2B pricing disabled",
      );
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <AdminToggleSwitch
          label="Enable B2B / wholesale pricing"
          checked={enabled}
          onChange={setEnabled}
        />
        Enable B2B / wholesale pricing for this product
      </label>

      {enabled ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="b2b-percent">Discount %</AdminFormLabel>
              <Input
                id="b2b-percent"
                type="number"
                min={0}
                max={100}
                value={percent}
                placeholder="e.g. 10"
                onChange={(event) => applyPercent(event.target.value)}
                className={adminFormControlClass}
              />
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="b2b-price">Wholesale price</AdminFormLabel>
              <Input
                id="b2b-price"
                type="number"
                min={0}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className={adminFormControlClass}
              />
            </div>
            <div className="space-y-1.5">
              <AdminFormLabel htmlFor="b2b-min-qty">
                Min order qty
              </AdminFormLabel>
              <Input
                id="b2b-min-qty"
                type="number"
                min={1}
                value={minQty}
                onChange={(event) => setMinQty(event.target.value)}
                className={adminFormControlClass}
              />
            </div>
          </div>
          {savedPercent !== null ? (
            <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
              Save ৳ {savings.toLocaleString("en-BD")} ({savedPercent}% off) vs
              retail ৳ {retailAmount.toLocaleString("en-BD")}
            </p>
          ) : null}
        </>
      ) : null}

      <Button type="button" size="sm" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save B2B pricing"}
      </Button>
    </div>
  );
}
