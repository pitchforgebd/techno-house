"use client";

import { useId, useState, type FormEvent } from "react";
import { buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/features/cart/use-cart-store";
import {
  applyCouponToSubtotal,
  MAX_COUPON_CODE_LENGTH,
} from "@/lib/cart/coupons";
import { formatMoney } from "@/lib/format/currency";

type CartCouponFormProps = {
  subtotal: number;
};

export function CartCouponForm({ subtotal }: CartCouponFormProps) {
  const { state, applyCoupon, removeCoupon } = useCartStore();
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const applied = state.couponCode
    ? applyCouponToSubtotal(state.couponCode, subtotal)
    : null;
  const appliedOk = applied?.ok === true ? applied : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = applyCoupon(draft);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setError(null);
    setDraft("");
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="text-label font-semibold text-text">Coupon</h3>
      <p className="mt-1 text-caption text-text-muted">
        Display preview only. Try{" "}
        <span className="font-mono text-text">SAVE10</span> or{" "}
        <span className="font-mono text-text">WELCOME500</span>. Not a real
        discount at checkout.
      </p>

      {appliedOk ? (
        <div className="mt-3 rounded-md border border-border bg-surface-muted/60 px-3 py-2.5">
          <p className="text-label font-medium text-text">
            Applied: <span className="font-mono">{appliedOk.coupon.code}</span>
          </p>
          <p className="mt-0.5 text-caption text-text-muted">
            {appliedOk.coupon.label} · −
            {formatMoney({ amount: appliedOk.discountAmount })}
          </p>
          <button
            type="button"
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              className: "mt-2",
            })}
            onClick={() => {
              removeCoupon();
              setError(null);
            }}
          >
            Remove coupon
          </button>
        </div>
      ) : (
        <form className="mt-3 space-y-2" onSubmit={onSubmit} noValidate>
          <Field
            label="Coupon code"
            htmlFor={inputId}
            error={error ?? undefined}
            hint={
              !error
                ? "Codes are checked against mock samples only."
                : undefined
            }
          >
            <div className="flex gap-2">
              <Input
                id={inputId}
                name="coupon"
                value={draft}
                maxLength={MAX_COUPON_CODE_LENGTH}
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter code"
                aria-invalid={error ? true : undefined}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (error) {
                    setError(null);
                  }
                }}
              />
              <button
                type="submit"
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                  className: "shrink-0",
                })}
              >
                Apply
              </button>
            </div>
          </Field>
        </form>
      )}
    </div>
  );
}
