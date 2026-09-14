/**
 * Payment gateway adapters (P13-T04).
 *
 * Core order code talks to this interface only. Live HTTP lives in the
 * SSLCommerz / bKash modules. This file never marks a payment paid.
 */
import { startBkashHostedSession } from "@/lib/payments/bkash";
import { startNagadHostedSession } from "@/lib/payments/nagad";
import { startSslcommerzHostedSession } from "@/lib/payments/sslcommerz";
import { findPaymentMethod, type PaymentMethodId } from "@/lib/cart/payment";

export type PaymentProviderId = "cod" | "sslcommerz" | "bkash" | "nagad";

export type PaymentFlow = "offline" | "hosted_deferred" | "hosted";

export type PaymentStartPlan = {
  provider: PaymentProviderId;
  method: PaymentMethodId;
  flow: PaymentFlow;
};

export type StartChargeInput = {
  orderNumber: string;
  amount: number;
  currency: "BDT";
  idempotencyKey: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
};

export type StartChargeResult =
  | { ok: true; flow: "offline" | "hosted_deferred" }
  | {
      ok: true;
      flow: "hosted";
      redirectUrl: string;
      sessionRef?: string;
    }
  | { ok: false; reason: string };

export interface PaymentGatewayAdapter {
  readonly provider: PaymentProviderId;
  startCharge(input: StartChargeInput): Promise<StartChargeResult>;
}

const COD_ADAPTER: PaymentGatewayAdapter = {
  provider: "cod",
  async startCharge() {
    return { ok: true, flow: "offline" };
  },
};

const ADAPTERS: Record<PaymentProviderId, PaymentGatewayAdapter> = {
  cod: COD_ADAPTER,
  sslcommerz: {
    provider: "sslcommerz",
    startCharge: startSslcommerzHostedSession,
  },
  bkash: {
    provider: "bkash",
    startCharge: startBkashHostedSession,
  },
  nagad: {
    provider: "nagad",
    startCharge: startNagadHostedSession,
  },
};

export function paymentStartKey(orderNumber: string): string {
  return `order:${orderNumber}:start`;
}

export function planPaymentStart(
  methodId: string | null,
): PaymentStartPlan | null {
  const method = findPaymentMethod(methodId);
  if (!method) {
    return null;
  }
  if (method.id === "cod") {
    return { provider: "cod", method: "cod", flow: "offline" };
  }
  return {
    provider: method.id,
    method: method.id,
    flow: "hosted_deferred",
  };
}

export function getPaymentAdapter(
  provider: PaymentProviderId,
): PaymentGatewayAdapter {
  return ADAPTERS[provider];
}

export function paymentFlowForProvider(
  provider: string | null,
  paymentStatus?: string | null,
): PaymentFlow | null {
  if (provider === "cod") {
    return "offline";
  }
  if (provider === "sslcommerz" || provider === "bkash" || provider === "nagad") {
    if (paymentStatus === "PROCESSING" || paymentStatus === "processing") {
      return "hosted";
    }
    return "hosted_deferred";
  }
  return null;
}
