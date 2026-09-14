import type {
  StartChargeInput,
  StartChargeResult,
} from "@/lib/payments/adapters";
import { parseTakaAmount } from "@/lib/payments/amount";
import type { WebhookProcessResult } from "@/lib/payments/callback-fields";
import {
  bkashBaseUrl,
  bkashRefundUrl,
  getPaymentGatewayConfig,
  hostedGatewayReady,
} from "@/lib/payments/config";
import {
  confirmGatewayPayment,
  rejectGatewayPayment,
} from "@/lib/payments/confirm";
import { gatewayGet, gatewayPost } from "@/lib/payments/http";
import { isAllowedPaymentRedirect } from "@/lib/payments/redirect";

type TokenGrantResponse = {
  id_token?: string;
  statusCode?: string;
};

type CreatePaymentResponse = {
  statusCode?: string;
  paymentID?: string;
  bkashURL?: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function tokenHeaders(config: {
  appKey: string;
  username: string;
  password: string;
}): Record<string, string> {
  return {
    username: config.username,
    password: config.password,
  };
}

async function grantBkashToken(): Promise<
  { ok: true; token: string } | { ok: false; reason: string }
> {
  const config = await getPaymentGatewayConfig();
  if (!config.bkash) {
    return { ok: false, reason: "bKash is not configured." };
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return { ok: true, token: cachedToken.value };
  }

  const posted = await gatewayPost({
    url: `${bkashBaseUrl(config.bkash.live)}/tokenized/checkout/token/grant`,
    contentType: "application/json",
    headers: tokenHeaders(config.bkash),
    body: JSON.stringify({
      app_key: config.bkash.appKey,
      app_secret: config.bkash.appSecret,
    }),
  });
  if (!posted.ok) {
    return posted;
  }

  let parsed: TokenGrantResponse;
  try {
    parsed = JSON.parse(posted.text) as TokenGrantResponse;
  } catch {
    return { ok: false, reason: "bKash returned an unreadable token." };
  }

  const token = parsed.id_token?.trim() ?? "";
  if (!token) {
    return { ok: false, reason: "bKash did not grant a session token." };
  }

  cachedToken = {
    value: token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };
  return { ok: true, token };
}

export async function startBkashHostedSession(
  input: StartChargeInput,
): Promise<StartChargeResult> {
  const ready = await hostedGatewayReady("bkash");
  if (!ready.ok) {
    return { ok: false, reason: ready.reason };
  }
  const config = await getPaymentGatewayConfig();
  if (!config.bkash || !config.publicBaseUrl) {
    return {
      ok: false,
      reason:
        "bKash is temporarily unavailable. Choose another payment method or try again later.",
    };
  }

  const granted = await grantBkashToken();
  if (!granted.ok) {
    return granted;
  }

  const posted = await gatewayPost({
    url: `${bkashBaseUrl(config.bkash.live)}/tokenized/checkout/payment/create`,
    contentType: "application/json",
    headers: {
      authorization: granted.token,
      "x-app-key": config.bkash.appKey,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference:
        input.customerPhone.replace(/\D/g, "").slice(-11) || "01XXXXXXXXX",
      callbackURL: `${config.publicBaseUrl}/api/payments/bkash/callback?order=${encodeURIComponent(input.orderNumber)}`,
      amount: String(input.amount),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: input.orderNumber,
    }),
  });
  if (!posted.ok) {
    return posted;
  }

  let parsed: CreatePaymentResponse;
  try {
    parsed = JSON.parse(posted.text) as CreatePaymentResponse;
  } catch {
    return { ok: false, reason: "bKash returned an unreadable response." };
  }

  const redirectUrl = parsed.bkashURL?.trim() ?? "";
  if (!redirectUrl || !isAllowedPaymentRedirect(redirectUrl)) {
    return { ok: false, reason: "bKash did not return a valid checkout page." };
  }

  return {
    ok: true,
    flow: "hosted",
    redirectUrl,
    sessionRef: parsed.paymentID?.trim() || undefined,
  };
}

type BkashChargeResponse = {
  statusCode?: string;
  statusMessage?: string;
  paymentID?: string;
  trxID?: string;
  transactionStatus?: string;
  amount?: string;
  currency?: string;
  merchantInvoiceNumber?: string;
};

export async function applyBkashChargeSnapshot(
  snapshot: BkashChargeResponse,
): Promise<WebhookProcessResult> {
  const status = snapshot.transactionStatus?.trim() ?? "";
  if (status !== "Completed") {
    return {
      acknowledged: true,
      paid: false,
      reason: "bKash has not completed the payment.",
    };
  }
  if ((snapshot.currency ?? "").trim().toUpperCase() !== "BDT") {
    return {
      acknowledged: true,
      paid: false,
      reason: "Payment currency does not match the order.",
    };
  }
  const amount = parseTakaAmount(snapshot.amount);
  const orderNumber = snapshot.merchantInvoiceNumber?.trim() ?? "";
  const transactionRef = snapshot.trxID?.trim() ?? "";
  if (amount === null || !orderNumber || !transactionRef) {
    return {
      acknowledged: true,
      paid: false,
      reason: "bKash confirmation is missing order or amount.",
    };
  }

  const confirmed = await confirmGatewayPayment({
    provider: "bkash",
    orderNumber,
    transactionRef,
    amount,
    currency: "BDT",
  });
  if (!confirmed.ok) {
    return { acknowledged: true, paid: false, reason: confirmed.reason };
  }
  return { acknowledged: true, paid: confirmed.paid };
}

/**
 * bKash's public docs describe this query-by-paymentID endpoint under the
 * plain "Checkout" product rather than explicitly under "Tokenized
 * Checkout" (developer.bka.sh docs/query-payment). It's only used as a
 * fallback when Execute doesn't immediately report "Completed" — verify
 * against bKash's sandbox for this merchant if that fallback ever matters.
 */
async function queryBkashPayment(
  paymentID: string,
): Promise<
  { ok: true; snapshot: BkashChargeResponse } | { ok: false; reason: string }
> {
  const config = await getPaymentGatewayConfig();
  if (!config.bkash) {
    return { ok: false, reason: "bKash is not configured." };
  }
  const granted = await grantBkashToken();
  if (!granted.ok) {
    return granted;
  }
  const fetched = await gatewayGet(
    `${bkashBaseUrl(config.bkash.live)}/tokenized/checkout/payment/query/${encodeURIComponent(paymentID)}`,
    {
      authorization: granted.token,
      "x-app-key": config.bkash.appKey,
    },
  );
  if (!fetched.ok) {
    return fetched;
  }
  try {
    return {
      ok: true,
      snapshot: JSON.parse(fetched.text) as BkashChargeResponse,
    };
  } catch {
    return { ok: false, reason: "bKash returned an unreadable status." };
  }
}

async function executeBkashPayment(
  paymentID: string,
): Promise<
  { ok: true; snapshot: BkashChargeResponse } | { ok: false; reason: string }
> {
  const config = await getPaymentGatewayConfig();
  if (!config.bkash) {
    return { ok: false, reason: "bKash is not configured." };
  }
  const granted = await grantBkashToken();
  if (!granted.ok) {
    return granted;
  }
  const posted = await gatewayPost({
    url: `${bkashBaseUrl(config.bkash.live)}/tokenized/checkout/execute/${encodeURIComponent(paymentID)}`,
    contentType: "application/json",
    headers: {
      authorization: granted.token,
      "x-app-key": config.bkash.appKey,
    },
    body: "{}",
  });
  if (!posted.ok) {
    return posted;
  }
  try {
    return {
      ok: true,
      snapshot: JSON.parse(posted.text) as BkashChargeResponse,
    };
  } catch {
    return {
      ok: false,
      reason: "bKash returned an unreadable execute result.",
    };
  }
}

export async function processBkashCallback(input: {
  orderNumber: string;
  paymentID: string | null;
  status: string | null;
}): Promise<WebhookProcessResult> {
  const config = await getPaymentGatewayConfig();
  const paymentID = input.paymentID?.trim() ?? "";
  const status = input.status?.trim().toLowerCase() ?? "";

  if (status === "cancel" || status === "failure" || status === "fail") {
    if (!paymentID || !input.orderNumber.trim()) {
      return {
        acknowledged: true,
        paid: false,
        reason: "Callback is incomplete.",
      };
    }
    const rejected = await rejectGatewayPayment({
      provider: "bkash",
      orderNumber: input.orderNumber,
      sessionRef: paymentID,
      next: status === "cancel" ? "CANCELLED" : "FAILED",
      failureReason: "Customer left bKash checkout.",
    });
    if (!rejected.ok) {
      return { acknowledged: true, paid: false, reason: rejected.reason };
    }
    return { acknowledged: true, paid: false };
  }

  if (status !== "success") {
    return {
      acknowledged: true,
      paid: false,
      reason: "bKash callback is not a success event.",
    };
  }
  if (!config.bkash) {
    return {
      acknowledged: true,
      paid: false,
      reason: "bKash is not configured.",
    };
  }
  if (!paymentID) {
    return {
      acknowledged: true,
      paid: false,
      reason: "Callback is missing paymentID.",
    };
  }

  const executed = await executeBkashPayment(paymentID);
  if (!executed.ok) {
    return { acknowledged: false, paid: false, reason: executed.reason };
  }

  let snapshot = executed.snapshot;
  if (snapshot.transactionStatus !== "Completed") {
    const queried = await queryBkashPayment(paymentID);
    if (!queried.ok) {
      return { acknowledged: false, paid: false, reason: queried.reason };
    }
    snapshot = queried.snapshot;
  }

  if (
    input.orderNumber.trim() &&
    snapshot.merchantInvoiceNumber &&
    snapshot.merchantInvoiceNumber.trim() !== input.orderNumber.trim()
  ) {
    return {
      acknowledged: true,
      paid: false,
      reason: "bKash invoice does not match the order.",
    };
  }

  return applyBkashChargeSnapshot(snapshot);
}

export async function refundBkashPayment(input: {
  paymentID: string;
  trxID: string;
  amount: number;
  reason: string;
}): Promise<{ ok: true; ref: string } | { ok: false; reason: string }> {
  const config = await getPaymentGatewayConfig();
  if (!config.bkash) {
    return { ok: false, reason: "bKash is not configured." };
  }
  const granted = await grantBkashToken();
  if (!granted.ok) {
    return granted;
  }
  const posted = await gatewayPost({
    url: bkashRefundUrl(config.bkash.live),
    contentType: "application/json",
    headers: {
      authorization: granted.token,
      "x-app-key": config.bkash.appKey,
    },
    body: JSON.stringify({
      paymentId: input.paymentID,
      trxId: input.trxID,
      refundAmount: String(input.amount),
      sku: "refund",
      reason: input.reason.slice(0, 80),
    }),
  });
  if (!posted.ok) {
    return posted;
  }
  let parsed: {
    refundTrxId?: string;
    refundTransactionStatus?: string;
    errorMessageEn?: string;
  };
  try {
    parsed = JSON.parse(posted.text) as {
      refundTrxId?: string;
      refundTransactionStatus?: string;
      errorMessageEn?: string;
    };
  } catch {
    return { ok: false, reason: "bKash returned an unreadable refund." };
  }
  const ref = parsed.refundTrxId?.trim() ?? "";
  if (ref && !parsed.errorMessageEn) {
    return { ok: true, ref };
  }
  return {
    ok: false,
    reason: parsed.errorMessageEn || "bKash did not refund this payment.",
  };
}
