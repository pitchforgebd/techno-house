"use server";

import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import type { CheckoutContact } from "@/lib/cart/checkout";
import {
  placeCustomerOrder,
  type PlaceOrderResult,
} from "@/lib/orders/create-order";

export type { PlaceOrderResult };

export async function placeOrderAction(input: {
  contact: CheckoutContact;
  paymentMethodId: string | null;
}): Promise<PlaceOrderResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, reason: CROSS_ORIGIN_ERROR };
  }
  return placeCustomerOrder({
    ...input.contact,
    paymentMethodId: input.paymentMethodId,
  });
}
