"use client";

import { Alert } from "@/components/ui/alert";
import { Radio, RadioGroup } from "@/components/ui/radio";
import { useCartStore } from "@/features/cart/use-cart-store";
import { MOCK_PAYMENT_METHODS, findPaymentMethod } from "@/lib/cart/payment";

export function CartPaymentForm() {
  const { state, setPaymentMethod } = useCartStore();
  const selected = findPaymentMethod(state.paymentMethodId);

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="text-label font-semibold text-text">Payment</h3>
      <p className="mt-1 text-caption text-text-muted">
        Mock method selection only. Nothing is charged. No card numbers, bKash
        PINs, or wallet secrets are collected on this page.
      </p>

      <Alert tone="info" title="Display-only payment UI" className="mt-3">
        <p className="text-caption">
          Live gateways, webhooks, and server totals arrive in later backend
          phases. The client is never authoritative for payment state.
        </p>
      </Alert>

      <div className="mt-3">
        <RadioGroup legend="Payment method">
          {MOCK_PAYMENT_METHODS.map((method) => (
            <div key={method.id}>
              <Radio
                name="cart-payment-method"
                value={method.id}
                label={method.name}
                checked={state.paymentMethodId === method.id}
                onChange={() => setPaymentMethod(method.id)}
              />
              <p className="ml-6 text-caption text-text-muted">
                {method.description}
              </p>
            </div>
          ))}
        </RadioGroup>
      </div>

      {selected ? (
        <p className="mt-3 rounded-md border border-border bg-surface-muted/60 px-3 py-2 text-caption text-text-muted">
          Selected:{" "}
          <span className="font-medium text-text">{selected.name}</span>.{" "}
          {selected.flowNote}
        </p>
      ) : (
        <p className="mt-3 text-caption text-text-muted">
          Choose a payment method to continue toward checkout (next tasks).
        </p>
      )}
    </div>
  );
}
