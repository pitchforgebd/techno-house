/**
 * Admin + runtime helpers for PaymentGatewaySetting (AD-207).
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  decryptGatewaySecrets,
  encryptGatewaySecrets,
  gatewaySecretsKeyConfigured,
} from "@/lib/payments/secret-crypto";

export type GatewayProviderId = "sslcommerz" | "bkash" | "nagad" | "cod";

export type SslcommerzPublicConfig = {
  storeId: string;
};

export type SslcommerzSecrets = {
  storePassword: string;
};

export type BkashPublicConfig = {
  appKey: string;
  username: string;
};

export type BkashSecrets = {
  appSecret: string;
  password: string;
};

export type NagadPublicConfig = {
  mode: string;
  merchantId: string;
  merchantNumber: string;
};

export type NagadSecrets = {
  publicKey: string;
  privateKey: string;
};

/** Safe admin form model — never includes raw secrets. */
export type AdminGatewayFormView = {
  provider: GatewayProviderId;
  enabled: boolean;
  sandbox: boolean;
  hasSecrets: boolean;
  secretsKeyReady: boolean;
  /** Non-secret fields only. */
  fields: Record<string, string>;
};

export type GatewayActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type GatewayMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function parseJsonObject(raw: string | null | undefined): Record<string, string> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function emptyView(provider: GatewayProviderId): AdminGatewayFormView {
  return {
    provider,
    enabled: false,
    sandbox: true,
    hasSecrets: false,
    secretsKeyReady: gatewaySecretsKeyConfigured(),
    fields: {},
  };
}

export async function listAdminGatewayViews(): Promise<{
  sslcommerz: AdminGatewayFormView;
  bkash: AdminGatewayFormView;
  nagad: AdminGatewayFormView;
}> {
  const base = {
    sslcommerz: emptyView("sslcommerz"),
    bkash: emptyView("bkash"),
    nagad: emptyView("nagad"),
  };
  if (!usesDatabase()) {
    return base;
  }
  const rows = await getPrisma().paymentGatewaySetting.findMany({
    where: { provider: { in: ["sslcommerz", "bkash", "nagad"] } },
  });
  for (const row of rows) {
    if (
      row.provider !== "sslcommerz" &&
      row.provider !== "bkash" &&
      row.provider !== "nagad"
    ) {
      continue;
    }
    base[row.provider] = {
      provider: row.provider,
      enabled: row.enabled,
      sandbox: row.sandbox,
      hasSecrets: Boolean(row.secretsCiphertext),
      secretsKeyReady: gatewaySecretsKeyConfigured(),
      fields: parseJsonObject(row.publicConfigJson),
    };
  }
  return base;
}

type DecryptedSsl = SslcommerzPublicConfig & SslcommerzSecrets & { sandbox: boolean; enabled: boolean };
type DecryptedBkash = BkashPublicConfig & BkashSecrets & { sandbox: boolean; enabled: boolean };

export async function loadDecryptedSslcommerzFromDb(): Promise<DecryptedSsl | null> {
  if (!usesDatabase()) {
    return null;
  }
  const row = await getPrisma().paymentGatewaySetting.findUnique({
    where: { provider: "sslcommerz" },
  });
  if (!row?.enabled || !row.secretsCiphertext) {
    return null;
  }
  const pub = parseJsonObject(row.publicConfigJson);
  const secrets = parseJsonObject(decryptGatewaySecrets(row.secretsCiphertext));
  const storeId = pub.storeId?.trim() ?? "";
  const storePassword = secrets.storePassword?.trim() ?? "";
  if (!storeId || !storePassword) {
    return null;
  }
  return {
    enabled: row.enabled,
    sandbox: row.sandbox,
    storeId,
    storePassword,
  };
}

export async function loadDecryptedBkashFromDb(): Promise<DecryptedBkash | null> {
  if (!usesDatabase()) {
    return null;
  }
  const row = await getPrisma().paymentGatewaySetting.findUnique({
    where: { provider: "bkash" },
  });
  if (!row?.enabled || !row.secretsCiphertext) {
    return null;
  }
  const pub = parseJsonObject(row.publicConfigJson);
  const secrets = parseJsonObject(decryptGatewaySecrets(row.secretsCiphertext));
  const appKey = pub.appKey?.trim() ?? "";
  const username = pub.username?.trim() ?? "";
  const appSecret = secrets.appSecret?.trim() ?? "";
  const password = secrets.password?.trim() ?? "";
  if (!appKey || !username || !appSecret || !password) {
    return null;
  }
  return {
    enabled: row.enabled,
    sandbox: row.sandbox,
    appKey,
    username,
    appSecret,
    password,
  };
}

type DecryptedNagad = NagadPublicConfig &
  NagadSecrets & { mode: string; sandbox: boolean; enabled: boolean };

export async function loadDecryptedNagadFromDb(): Promise<DecryptedNagad | null> {
  if (!usesDatabase()) {
    return null;
  }
  const row = await getPrisma().paymentGatewaySetting.findUnique({
    where: { provider: "nagad" },
  });
  if (!row?.enabled || !row.secretsCiphertext) {
    return null;
  }
  const pub = parseJsonObject(row.publicConfigJson);
  const secrets = parseJsonObject(decryptGatewaySecrets(row.secretsCiphertext));
  const merchantId = pub.merchantId?.trim() ?? "";
  const merchantNumber = pub.merchantNumber?.trim() ?? "";
  const publicKey = secrets.publicKey?.trim() ?? "";
  const privateKey = secrets.privateKey?.trim() ?? "";
  if (!merchantId || !publicKey || !privateKey) {
    return null;
  }
  return {
    enabled: row.enabled,
    sandbox: row.sandbox,
    mode: pub.mode?.trim() ?? "",
    merchantId,
    merchantNumber,
    publicKey,
    privateKey,
  };
}

async function mergeSecrets(
  provider: GatewayProviderId,
  nextSecrets: Record<string, string>,
): Promise<string | null> {
  const existing = await getPrisma().paymentGatewaySetting.findUnique({
    where: { provider },
    select: { secretsCiphertext: true },
  });
  const previous = existing?.secretsCiphertext
    ? parseJsonObject(decryptGatewaySecrets(existing.secretsCiphertext))
    : {};
  const merged: Record<string, string> = { ...previous };
  for (const [key, value] of Object.entries(nextSecrets)) {
    const trimmed = value.trim();
    if (trimmed) {
      merged[key] = trimmed;
    }
  }
  const hasAny = Object.values(merged).some((v) => v.trim().length > 0);
  if (!hasAny) {
    return existing?.secretsCiphertext ?? null;
  }
  return encryptGatewaySecrets(JSON.stringify(merged));
}

export async function saveSslcommerzGateway(input: {
  enabled: boolean;
  sandbox: boolean;
  storeId: string;
  storePassword: string;
  actor: GatewayActor;
}): Promise<GatewayMutationResult> {
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Payment settings need the database.",
    };
  }
  if (!gatewaySecretsKeyConfigured()) {
    return {
      ok: false,
      formError:
        "Set GATEWAY_SECRETS_KEY in .env.local (min 16 characters) before saving secrets.",
    };
  }
  const storeId = input.storeId.trim().slice(0, 120);
  if (input.enabled && !storeId) {
    return { ok: false, formError: "Enter the SSLCommerz store id." };
  }
  try {
    const secretsCiphertext = await mergeSecrets("sslcommerz", {
      storePassword: input.storePassword,
    });
    if (input.enabled && !secretsCiphertext) {
      return {
        ok: false,
        formError: "Enter the SSLCommerz store password (or save one first).",
      };
    }
    await getPrisma().paymentGatewaySetting.upsert({
      where: { provider: "sslcommerz" },
      create: {
        provider: "sslcommerz",
        enabled: input.enabled,
        sandbox: input.sandbox,
        publicConfigJson: JSON.stringify({ storeId }),
        secretsCiphertext,
        secretsUpdatedAt: secretsCiphertext ? new Date() : null,
        updatedByStaffId: input.actor.staffId,
      },
      update: {
        enabled: input.enabled,
        sandbox: input.sandbox,
        publicConfigJson: JSON.stringify({ storeId }),
        secretsCiphertext,
        secretsUpdatedAt: input.storePassword.trim()
          ? new Date()
          : undefined,
        updatedByStaffId: input.actor.staffId,
      },
    });
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.PAYMENT_GATEWAY_UPDATE,
      entityType: "PaymentGatewaySetting",
      entityId: "sslcommerz",
      ip: input.actor.ip,
      metadata: {
        provider: "sslcommerz",
        enabled: input.enabled,
        sandbox: input.sandbox,
        secretsUpdated: Boolean(input.storePassword.trim()),
      },
    });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save SSLCommerz settings.";
    return { ok: false, formError: message };
  }
}

export async function saveBkashGateway(input: {
  enabled: boolean;
  sandbox: boolean;
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  actor: GatewayActor;
}): Promise<GatewayMutationResult> {
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Payment settings need the database.",
    };
  }
  if (!gatewaySecretsKeyConfigured()) {
    return {
      ok: false,
      formError:
        "Set GATEWAY_SECRETS_KEY in .env.local (min 16 characters) before saving secrets.",
    };
  }
  const appKey = input.appKey.trim().slice(0, 200);
  const username = input.username.trim().slice(0, 120);
  if (input.enabled && (!appKey || !username)) {
    return { ok: false, formError: "Enter bKash app key and username." };
  }
  try {
    const secretsCiphertext = await mergeSecrets("bkash", {
      appSecret: input.appSecret,
      password: input.password,
    });
    if (input.enabled) {
      const secrets = secretsCiphertext
        ? parseJsonObject(decryptGatewaySecrets(secretsCiphertext))
        : {};
      if (!secrets.appSecret?.trim() || !secrets.password?.trim()) {
        return {
          ok: false,
          formError: "Enter bKash app secret and password (or keep existing).",
        };
      }
    }
    await getPrisma().paymentGatewaySetting.upsert({
      where: { provider: "bkash" },
      create: {
        provider: "bkash",
        enabled: input.enabled,
        sandbox: input.sandbox,
        publicConfigJson: JSON.stringify({ appKey, username }),
        secretsCiphertext,
        secretsUpdatedAt: secretsCiphertext ? new Date() : null,
        updatedByStaffId: input.actor.staffId,
      },
      update: {
        enabled: input.enabled,
        sandbox: input.sandbox,
        publicConfigJson: JSON.stringify({ appKey, username }),
        secretsCiphertext,
        secretsUpdatedAt:
          input.appSecret.trim() || input.password.trim()
            ? new Date()
            : undefined,
        updatedByStaffId: input.actor.staffId,
      },
    });
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.PAYMENT_GATEWAY_UPDATE,
      entityType: "PaymentGatewaySetting",
      entityId: "bkash",
      ip: input.actor.ip,
      metadata: {
        provider: "bkash",
        enabled: input.enabled,
        sandbox: input.sandbox,
        secretsUpdated: Boolean(
          input.appSecret.trim() || input.password.trim(),
        ),
      },
    });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save bKash settings.";
    return { ok: false, formError: message };
  }
}

export async function saveNagadGateway(input: {
  enabled: boolean;
  mode: string;
  merchantId: string;
  merchantNumber: string;
  publicKey: string;
  privateKey: string;
  actor: GatewayActor;
}): Promise<GatewayMutationResult> {
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Payment settings need the database.",
    };
  }
  if (!gatewaySecretsKeyConfigured()) {
    return {
      ok: false,
      formError:
        "Set GATEWAY_SECRETS_KEY in .env.local (min 16 characters) before saving secrets.",
    };
  }
  try {
    const secretsCiphertext = await mergeSecrets("nagad", {
      publicKey: input.publicKey,
      privateKey: input.privateKey,
    });
    const publicConfigJson = JSON.stringify({
      mode: input.mode.trim().slice(0, 80),
      merchantId: input.merchantId.trim().slice(0, 120),
      merchantNumber: input.merchantNumber.trim().slice(0, 40),
    });
    await getPrisma().paymentGatewaySetting.upsert({
      where: { provider: "nagad" },
      create: {
        provider: "nagad",
        enabled: input.enabled,
        sandbox: true,
        publicConfigJson,
        secretsCiphertext,
        secretsUpdatedAt: secretsCiphertext ? new Date() : null,
        updatedByStaffId: input.actor.staffId,
      },
      update: {
        enabled: input.enabled,
        publicConfigJson,
        secretsCiphertext,
        secretsUpdatedAt:
          input.publicKey.trim() || input.privateKey.trim()
            ? new Date()
            : undefined,
        updatedByStaffId: input.actor.staffId,
      },
    });
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.PAYMENT_GATEWAY_UPDATE,
      entityType: "PaymentGatewaySetting",
      entityId: "nagad",
      ip: input.actor.ip,
      metadata: {
        provider: "nagad",
        enabled: input.enabled,
        secretsUpdated: Boolean(
          input.publicKey.trim() || input.privateKey.trim(),
        ),
      },
    });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save Nagad settings.";
    return { ok: false, formError: message };
  }
}
