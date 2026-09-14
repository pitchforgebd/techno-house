"use client";

import { Radio, RadioGroup } from "@/components/ui/radio";
import { useCartStore } from "@/features/cart/use-cart-store";
import { MOCK_PAYMENT_METHODS, findPaymentMethod } from "@/lib/cart/payment";

export function CartPaymentForm() {
  const { state, setPaymentMethod } = useCartStore();
  const selected = findPaymentMethod(state.paymentMethodId);

  return (
    <div className="mt-4 border-t border-border pt-4">
      <RadioGroup legend="Payment method">
        {MOCK_PAYMENT_METHODS.map((method) => (
          <Radio
            key={method.id}
            name="cart-payment-method"
            value={method.id}
            label={method.name}
            checked={state.paymentMethodId === method.id}
            onChange={() => setPaymentMethod(method.id)}
          />
        ))}
      </RadioGroup>
      {selected ? (
        <p className="mt-2 text-caption text-text-muted">{selected.flowNote}</p>
      ) : null}
    </div>
  );
}
