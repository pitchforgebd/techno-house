import { createHash } from "node:crypto";
import type {
  StartChargeInput,
  StartChargeResult,
} from "@/lib/payments/adapters";
import { parseTakaAmount } from "@/lib/payments/amount";
import type { WebhookProcessResult } from "@/lib/payments/callback-fields";
import {
  getPaymentGatewayConfig,
  hostedGatewayReady,
  sslcommerzMerchantValidationUrl,
  sslcommerzSessionUrl,
  sslcommerzValidationUrl,
} from "@/lib/payments/config";
import { confirmGatewayPayment } from "@/lib/payments/confirm";
import { gatewayGet, gatewayPost } from "@/lib/payments/http";
import { isAllowedPaymentRedirect, takaAmount } from "@/lib/payments/redirect";

type SslcommerzSessionResponse = {
  status?: string;
  GatewayPageURL?: string;
  sessionkey?: string;
};

export async function startSslcommerzHostedSession(
  input: StartChargeInput,
): Promise<StartChargeResult> {
  const ready = await hostedGatewayReady("sslcommerz");
  if (!ready.ok) {
    return { ok: false, reason: ready.reason };
  }
  const config = await getPaymentGatewayConfig();
  if (!config.sslcommerz || !config.publicBaseUrl) {
    return {
      ok: false,
      reason:
        "SSLCommerz is temporarily unavailable. Choose another payment method or try again later.",
    };
  }

  const params = new URLSearchParams({
    store_id: config.sslcommerz.storeId,
    store_passwd: config.sslcommerz.storePassword,
    total_amount: takaAmount(input.amount),
    currency: "BDT",
    tran_id: input.orderNumber,
    success_url: `${config.publicBaseUrl}/checkout/payment/return?order=${encodeURIComponent(input.orderNumber)}&status=success`,
    fail_url: `${config.publicBaseUrl}/checkout/payment/return?order=${encodeURIComponent(input.orderNumber)}&status=fail`,
    cancel_url: `${config.publicBaseUrl}/checkout/payment/return?order=${encodeURIComponent(input.orderNumber)}&status=cancel`,
    ipn_url: `${config.publicBaseUrl}/api/payments/sslcommerz/ipn`,
    cus_name: input.customerName.slice(0, 50),
    cus_email: input.customerEmail,
    cus_add1: input.customerAddress.slice(0, 50),
    cus_add2: "N/A",
    cus_city: "Dhaka",
    cus_state: "Dhaka",
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    cus_phone: input.customerPhone,
    shipping_method: "NO",
    product_name: `Techno House ${input.orderNumber}`,
    product_category: "electronics",
    product_profile: "general",
  });

  const posted = await gatewayPost({
    url: sslcommerzSessionUrl(config.sslcommerz.live),
    contentType: "application/x-www-form-urlencoded",
    body: params.toString(),
  });
  if (!posted.ok) {
    return posted;
  }

  let parsed: SslcommerzSessionResponse;
  try {
    parsed = JSON.parse(posted.text) as SslcommerzSessionResponse;
  } catch {
    return { ok: false, reason: "SSLCommerz returned an unreadable response." };
  }

  const redirectUrl = parsed.GatewayPageURL?.trim() ?? "";
  if (
    parsed.status !== "SUCCESS" ||
    !redirectUrl ||
    !isAllowedPaymentRedirect(redirectUrl)
  ) {
    return {
      ok: false,
      reason: "SSLCommerz did not return a valid checkout page.",
    };
  }

  return {
    ok: true,
    flow: "hosted",
    redirectUrl,
    sessionRef: parsed.sessionkey?.trim() || undefined,
  };
}

type SslcommerzValidationResponse = {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  bank_tran_id?: string;
  store_id?: string;
};

export function sslcommerzIpnHashValid(
  fields: Record<string, string>,
  storePassword: string,
): boolean {
  const sign = fields.verify_sign?.trim() ?? "";
  const keys = fields.verify_key?.trim() ?? "";
  if (!sign || !keys) {
    return false;
  }
  const data: Record<string, string> = {};
  for (const key of keys.split(",")) {
    const name = key.trim();
    if (name) {
      data[name] = fields[name] ?? "";
    }
  }
  data.store_passwd = createHash("md5").update(storePassword).digest("hex");
  const hashString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("&");
  return createHash("md5").update(hashString).digest("hex") === sign;
}

export async function applySslcommerzValidation(
  validated: SslcommerzValidationResponse,
  expectedStoreId?: string | null,
): Promise<WebhookProcessResult> {
  const status = validated.status?.trim().toUpperCase() ?? "";
  if (status !== "VALID" && status !== "VALIDATED") {
    return {
      acknowledged: true,
      paid: false,
      reason: "Not a paid validation.",
    };
  }
  if (
    expectedStoreId &&
    validated.store_id &&
    validated.store_id.trim() !== expectedStoreId
  ) {
    return {
      acknowledged: true,
      paid: false,
      reason: "Store id does not match.",
    };
  }
  if ((validated.currency ?? "").trim().toUpperCase() !== "BDT") {
    return {
      acknowledged: true,
      paid: false,
      reason: "Payment currency does not match the order.",
    };
  }
  const amount = parseTakaAmount(validated.amount);
  const orderNumber = validated.tran_id?.trim() ?? "";
  const transactionRef =
    validated.bank_tran_id?.trim() || validated.val_id?.trim() || "";
  if (amount === null || !orderNumber || !transactionRef) {
    return {
      acknowledged: true,
      paid: false,
      reason: "Validation is missing order or amount.",
    };
  }

  const confirmed = await confirmGatewayPayment({
    provider: "sslcommerz",
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

export async function processSslcommerzIpn(
  fields: Record<string, string>,
): Promise<WebhookProcessResult> {
  const config = await getPaymentGatewayConfig();
  if (!config.sslcommerz) {
    return {
      acknowledged: true,
      paid: false,
      reason: "SSLCommerz is not configured.",
    };
  }
  if (
    fields.verify_sign &&
    fields.verify_key &&
    !sslcommerzIpnHashValid(fields, config.sslcommerz.storePassword)
  ) {
    return {
      acknowledged: true,
      paid: false,
      reason: "IPN signature is invalid.",
    };
  }

  const valId = fields.val_id?.trim() ?? "";
  if (!valId) {
    return {
      acknowledged: true,
      paid: false,
      reason: "IPN is missing val_id.",
    };
  }

  const url = new URL(sslcommerzValidationUrl(config.sslcommerz.live));
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", config.sslcommerz.storeId);
  url.searchParams.set("store_passwd", config.sslcommerz.storePassword);
  url.searchParams.set("format", "json");

  const fetched = await gatewayGet(url.toString());
  if (!fetched.ok) {
    return { acknowledged: false, paid: false, reason: fetched.reason };
  }

  let parsed: SslcommerzValidationResponse;
  try {
    parsed = JSON.parse(fetched.text) as SslcommerzValidationResponse;
  } catch {
    return {
      acknowledged: false,
      paid: false,
      reason: "SSLCommerz returned an unreadable validation.",
    };
  }

  return applySslcommerzValidation(parsed, config.sslcommerz.storeId);
}

export async function refundSslcommerzPayment(input: {
  bankTranId: string;
  amount: number;
  remarks: string;
  refundCode: string;
}): Promise<{ ok: true; ref: string } | { ok: false; reason: string }> {
  const config = await getPaymentGatewayConfig();
  if (!config.sslcommerz) {
    return { ok: false, reason: "SSLCommerz is not configured." };
  }
  const url = new URL(sslcommerzMerchantValidationUrl(config.sslcommerz.live));
  url.searchParams.set("bank_tran_id", input.bankTranId);
  url.searchParams.set("store_id", config.sslcommerz.storeId);
  url.searchParams.set("store_passwd", config.sslcommerz.storePassword);
  url.searchParams.set("refund_amount", takaAmount(input.amount));
  url.searchParams.set("refund_remarks", input.remarks.slice(0, 80));
  url.searchParams.set("refund_trans_id", input.refundCode);
  url.searchParams.set("format", "json");

  const fetched = await gatewayGet(url.toString());
  if (!fetched.ok) {
    return fetched;
  }
  let parsed: { status?: string; refund_ref_id?: string; errorReason?: string };
  try {
    parsed = JSON.parse(fetched.text) as {
      status?: string;
      refund_ref_id?: string;
      errorReason?: string;
    };
  } catch {
    return { ok: false, reason: "SSLCommerz returned an unreadable refund." };
  }
  const ref = parsed.refund_ref_id?.trim() ?? "";
  const status = parsed.status?.trim().toLowerCase() ?? "";
  if (ref && (status === "success" || status === "processing")) {
    return { ok: true, ref };
  }
  return { ok: false, reason: "SSLCommerz did not refund this payment." };
}
