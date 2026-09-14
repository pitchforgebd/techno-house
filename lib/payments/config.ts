/**
 * Payment gateway credentials (P13-T04 / AD-207).
 *
 * Prefer admin DB settings (encrypted). Fall back to env vars when DB rows
 * are missing. Secrets stay server-side and are never returned to Client
 * Components.
 */
import { cache } from "react";
import {
  loadDecryptedBkashFromDb,
  loadDecryptedNagadFromDb,
  loadDecryptedSslcommerzFromDb,
} from "@/lib/payments/gateway-settings";

function readFlag(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function readOptional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function readPublicBaseUrl(): string | null {
  const raw =
    readOptional("PAYMENT_PUBLIC_BASE_URL") ?? readOptional("APP_URL");
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return null;
      }
      return url.origin;
    } catch {
      return null;
    }
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:3000";
  }
  return null;
}

export type SslcommerzConfig = {
  storeId: string;
  storePassword: string;
  live: boolean;
};

export type BkashConfig = {
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  live: boolean;
};

export type NagadConfig = {
  merchantId: string;
  merchantNumber: string;
  publicKey: string;
  privateKey: string;
  live: boolean;
};

export type PaymentGatewayConfig = {
  publicBaseUrl: string | null;
  sslcommerz: SslcommerzConfig | null;
  bkash: BkashConfig | null;
  nagad: NagadConfig | null;
};

export type HostedGatewayId = "sslcommerz" | "bkash" | "nagad";

export type HostedGatewayReady =
  | { ok: true }
  | { ok: false; reason: string };

function envSslcommerz(): SslcommerzConfig | null {
  const storeId = readOptional("SSLCOMMERZ_STORE_ID");
  const storePassword = readOptional("SSLCOMMERZ_STORE_PASSWORD");
  if (!storeId || !storePassword) {
    return null;
  }
  return {
    storeId,
    storePassword,
    live: readFlag("SSLCOMMERZ_LIVE"),
  };
}

function envBkash(): BkashConfig | null {
  const appKey = readOptional("BKASH_APP_KEY");
  const appSecret = readOptional("BKASH_APP_SECRET");
  const username = readOptional("BKASH_USERNAME");
  const password = readOptional("BKASH_PASSWORD");
  if (!appKey || !appSecret || !username || !password) {
    return null;
  }
  return {
    appKey,
    appSecret,
    username,
    password,
    live: readFlag("BKASH_LIVE"),
  };
}

/**
 * Resolve gateway config once per React request (DB first, then env).
 */
export const getPaymentGatewayConfig = cache(
  async (): Promise<PaymentGatewayConfig> => {
    if (typeof window !== "undefined") {
      throw new Error("Payment config is server-only.");
    }

    const [dbSsl, dbBkash, dbNagad] = await Promise.all([
      loadDecryptedSslcommerzFromDb(),
      loadDecryptedBkashFromDb(),
      loadDecryptedNagadFromDb(),
    ]);

    return {
      publicBaseUrl: readPublicBaseUrl(),
      sslcommerz: dbSsl
        ? {
            storeId: dbSsl.storeId,
            storePassword: dbSsl.storePassword,
            live: !dbSsl.sandbox,
          }
        : envSslcommerz(),
      bkash: dbBkash
        ? {
            appKey: dbBkash.appKey,
            appSecret: dbBkash.appSecret,
            username: dbBkash.username,
            password: dbBkash.password,
            live: !dbBkash.sandbox,
          }
        : envBkash(),
      nagad: dbNagad
        ? {
            merchantId: dbNagad.merchantId,
            merchantNumber: dbNagad.merchantNumber,
            publicKey: dbNagad.publicKey,
            privateKey: dbNagad.privateKey,
            live: dbNagad.mode.trim().toLowerCase() === "live",
          }
        : null,
    };
  },
);

/** Whether a hosted session can be started for this provider. */
export async function hostedGatewayReady(
  provider: HostedGatewayId,
): Promise<HostedGatewayReady> {
  const config = await getPaymentGatewayConfig();
  if (!config.publicBaseUrl) {
    return {
      ok: false,
      reason:
        "Set APP_URL (or PAYMENT_PUBLIC_BASE_URL) so the payment return URL works.",
    };
  }
  if (provider === "sslcommerz") {
    if (!config.sslcommerz) {
      return {
        ok: false,
        reason:
          "SSLCommerz is temporarily unavailable. Choose another payment method or try again later.",
      };
    }
    return { ok: true };
  }
  if (provider === "nagad") {
    if (!config.nagad) {
      return {
        ok: false,
        reason:
          "Nagad is temporarily unavailable. Choose another payment method or try again later.",
      };
    }
    return { ok: true };
  }
  if (!config.bkash) {
    return {
      ok: false,
      reason:
        "bKash is temporarily unavailable. Choose another payment method or try again later.",
    };
  }
  return { ok: true };
}

/** Safe flags for checkout UI (no secrets). */
export async function listHostedGatewayAvailability(): Promise<{
  sslcommerz: boolean;
  bkash: boolean;
  nagad: boolean;
}> {
  const config = await getPaymentGatewayConfig();
  return {
    sslcommerz: Boolean(config.sslcommerz && config.publicBaseUrl),
    bkash: Boolean(config.bkash && config.publicBaseUrl),
    nagad: Boolean(config.nagad && config.publicBaseUrl),
  };
}

export function sslcommerzSessionUrl(live: boolean): string {
  return live
    ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
    : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
}

export function sslcommerzValidationUrl(live: boolean): string {
  return live
    ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
    : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";
}

export function sslcommerzMerchantValidationUrl(live: boolean): string {
  return live
    ? "https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php"
    : "https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php";
}

export function bkashBaseUrl(live: boolean): string {
  return live
    ? "https://tokenized.pay.bka.sh/v1.2.0-beta"
    : "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
}

/**
 * bKash's Refund Transaction API lives on a "v2" path, not under
 * v1.2.0-beta (developer.bka.sh docs/refund-transaction). Same host as
 * bkashBaseUrl, different version segment.
 */
export function bkashRefundUrl(live: boolean): string {
  return live
    ? "https://tokenized.pay.bka.sh/v2/tokenized-checkout/refund/payment/transaction"
    : "https://tokenized.sandbox.bka.sh/v2/tokenized-checkout/refund/payment/transaction";
}

/**
 * Nagad Payment Gateway base URL. Best-effort from public integration
 * guides — confirm against the host/path Nagad issued for this merchant
 * before relying on this in production.
 */
export function nagadBaseUrl(live: boolean): string {
  return live
    ? "https://api.mynagad.com/api/dfs"
    : "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs";
}
