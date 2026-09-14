/**
 * Nagad Payment Gateway (PGW) adapter.
 *
 * Best-effort from Nagad's publicly documented Checkout API — field names,
 * headers, and endpoint paths have varied across integration guides and
 * this has not been run against a live Nagad sandbox. Verify against the
 * current docs / Postman collection Nagad issued for this merchant before
 * going live. The RSA request/response shape mirrors Nagad's own PHP
 * samples (see lib/payments/nagad-crypto.ts).
 */
import type {
  StartChargeInput,
  StartChargeResult,
} from "@/lib/payments/adapters";
import { parseTakaAmount } from "@/lib/payments/amount";
import type { WebhookProcessResult } from "@/lib/payments/callback-fields";
import {
  getPaymentGatewayConfig,
  hostedGatewayReady,
  nagadBaseUrl,
} from "@/lib/payments/config";
import { confirmGatewayPayment, rejectGatewayPayment } from "@/lib/payments/confirm";
import { gatewayGet, gatewayPost } from "@/lib/payments/http";
import {
  decryptFromNagad,
  encryptForNagad,
  nagadChallenge,
  nagadDateTime,
  signForNagad,
} from "@/lib/payments/nagad-crypto";
import { isAllowedPaymentRedirect, takaAmount } from "@/lib/payments/redirect";

type NagadEnvelope = { sensitiveData?: string; signature?: string };

type NagadInitializeSensitive = {
  paymentReferenceId?: string;
  challenge?: string;
};

type NagadCompleteResponse = {
  status?: string;
  message?: string;
  callBackUrl?: string;
};

export async function startNagadHostedSession(
  input: StartChargeInput,
): Promise<StartChargeResult> {
  const ready = await hostedGatewayReady("nagad");
  if (!ready.ok) {
    return { ok: false, reason: ready.reason };
  }
  const config = await getPaymentGatewayConfig();
  if (!config.nagad || !config.publicBaseUrl) {
    return {
      ok: false,
      reason:
        "Nagad is temporarily unavailable. Choose another payment method or try again later.",
    };
  }
  const { merchantId, publicKey, privateKey, live } = config.nagad;
  const orderId = input.orderNumber;
  const baseUrl = nagadBaseUrl(live);

  const initPlaintext = JSON.stringify({
    merchantId,
    datetime: nagadDateTime(),
    orderId,
    challenge: nagadChallenge(),
  });
  const initPosted = await gatewayPost({
    url: `${baseUrl}/check-out/initialize/${merchantId}/${encodeURIComponent(orderId)}`,
    contentType: "application/json",
    headers: {
      "X-KM-Api-Version": "v-0.2.0",
      "X-KM-Client-Type": "PC_WEB",
    },
    body: JSON.stringify({
      dateTime: nagadDateTime(),
      sensitiveData: encryptForNagad(initPlaintext, publicKey),
      signature: signForNagad(initPlaintext, privateKey),
    }),
  });
  if (!initPosted.ok) {
    return initPosted;
  }

  let initEnvelope: NagadEnvelope;
  try {
    initEnvelope = JSON.parse(initPosted.text) as NagadEnvelope;
  } catch {
    return { ok: false, reason: "Nagad returned an unreadable initialize response." };
  }
  const initDecrypted = initEnvelope.sensitiveData
    ? decryptFromNagad(initEnvelope.sensitiveData, publicKey)
    : null;
  if (!initDecrypted) {
    return { ok: false, reason: "Could not read Nagad's initialize response." };
  }
  let initParsed: NagadInitializeSensitive;
  try {
    initParsed = JSON.parse(initDecrypted) as NagadInitializeSensitive;
  } catch {
    return { ok: false, reason: "Nagad initialize response was malformed." };
  }
  const paymentReferenceId = initParsed.paymentReferenceId?.trim() ?? "";
  const challenge = initParsed.challenge?.trim() ?? "";
  if (!paymentReferenceId || !challenge) {
    return { ok: false, reason: "Nagad did not return a payment reference." };
  }

  const callbackUrl = `${config.publicBaseUrl}/api/payments/nagad/callback?order=${encodeURIComponent(orderId)}`;
  const completePlaintext = JSON.stringify({
    merchantId,
    orderId,
    currencyCode: "050",
    amount: takaAmount(input.amount),
    challenge,
  });
  const completePosted = await gatewayPost({
    url: `${baseUrl}/check-out/complete/${paymentReferenceId}`,
    contentType: "application/json",
    headers: {
      "X-KM-Api-Version": "v-0.2.0",
      "X-KM-Client-Type": "PC_WEB",
    },
    body: JSON.stringify({
      sensitiveData: encryptForNagad(completePlaintext, publicKey),
      signature: signForNagad(completePlaintext, privateKey),
      merchantCallbackURL: callbackUrl,
    }),
  });
  if (!completePosted.ok) {
    return completePosted;
  }

  let completeParsed: NagadCompleteResponse;
  try {
    completeParsed = JSON.parse(completePosted.text) as NagadCompleteResponse;
  } catch {
    return { ok: false, reason: "Nagad returned an unreadable checkout page." };
  }
  const redirectUrl = completeParsed.callBackUrl?.trim() ?? "";
  if (
    completeParsed.status !== "Success" ||
    !redirectUrl ||
    !isAllowedPaymentRedirect(redirectUrl)
  ) {
    return { ok: false, reason: "Nagad did not return a valid checkout page." };
  }

  return {
    ok: true,
    flow: "hosted",
    redirectUrl,
    sessionRef: paymentReferenceId,
  };
}

type NagadVerifyResponse = {
  status?: string;
  amount?: string;
  currencyCode?: string;
  orderId?: string;
  issuerPaymentRefNo?: string;
};

async function verifyNagadPayment(
  paymentReferenceId: string,
  live: boolean,
): Promise<{ ok: true; snapshot: NagadVerifyResponse } | { ok: false; reason: string }> {
  const fetched = await gatewayGet(
    `${nagadBaseUrl(live)}/verify/payment/${encodeURIComponent(paymentReferenceId)}`,
  );
  if (!fetched.ok) {
    return fetched;
  }
  try {
    return { ok: true, snapshot: JSON.parse(fetched.text) as NagadVerifyResponse };
  } catch {
    return { ok: false, reason: "Nagad returned an unreadable verification." };
  }
}

export async function processNagadCallback(input: {
  orderNumber: string;
  paymentRefId: string | null;
  status: string | null;
}): Promise<WebhookProcessResult> {
  const config = await getPaymentGatewayConfig();
  const paymentRefId = input.paymentRefId?.trim() ?? "";
  const status = input.status?.trim().toLowerCase() ?? "";
  const orderNumber = input.orderNumber.trim();

  if (status === "cancelled" || status === "failed" || status === "failure") {
    if (!paymentRefId || !orderNumber) {
      return { acknowledged: true, paid: false, reason: "Callback is incomplete." };
    }
    const rejected = await rejectGatewayPayment({
      provider: "nagad",
      orderNumber,
      sessionRef: paymentRefId,
      next: status === "cancelled" ? "CANCELLED" : "FAILED",
      failureReason: "Customer left Nagad checkout.",
    });
    if (!rejected.ok) {
      return { acknowledged: true, paid: false, reason: rejected.reason };
    }
    return { acknowledged: true, paid: false };
  }

  if (!config.nagad) {
    return { acknowledged: true, paid: false, reason: "Nagad is not configured." };
  }
  if (!paymentRefId) {
    return { acknowledged: true, paid: false, reason: "Callback is missing payment_ref_id." };
  }

  const verified = await verifyNagadPayment(paymentRefId, config.nagad.live);
  if (!verified.ok) {
    return { acknowledged: false, paid: false, reason: verified.reason };
  }
  const snapshot = verified.snapshot;
  if (snapshot.status !== "Success") {
    return {
      acknowledged: true,
      paid: false,
      reason: "Nagad has not completed the payment.",
    };
  }
  if ((snapshot.currencyCode ?? "").trim() !== "050") {
    return {
      acknowledged: true,
      paid: false,
      reason: "Payment currency does not match the order.",
    };
  }
  const amount = parseTakaAmount(snapshot.amount);
  const verifiedOrderNumber = snapshot.orderId?.trim() ?? "";
  const transactionRef = snapshot.issuerPaymentRefNo?.trim() ?? "";
  if (amount === null || !verifiedOrderNumber || !transactionRef) {
    return {
      acknowledged: true,
      paid: false,
      reason: "Nagad confirmation is missing order or amount.",
    };
  }
  if (orderNumber && verifiedOrderNumber !== orderNumber) {
    return {
      acknowledged: true,
      paid: false,
      reason: "Nagad order does not match the order.",
    };
  }

  const confirmed = await confirmGatewayPayment({
    provider: "nagad",
    orderNumber: verifiedOrderNumber,
    transactionRef,
    amount,
    currency: "BDT",
  });
  if (!confirmed.ok) {
    return { acknowledged: true, paid: false, reason: confirmed.reason };
  }
  return { acknowledged: true, paid: confirmed.paid };
}
