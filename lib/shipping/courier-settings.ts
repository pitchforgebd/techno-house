/**
 * Courier API credentials (Pathao/Steadfast — Admin → Shipping).
 * Mirrors lib/payments/gateway-settings.ts exactly.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  courierSecretsKeyConfigured,
  decryptCourierSecrets,
  encryptCourierSecrets,
} from "@/lib/shipping/courier-secret-crypto";

export type CourierProviderId = "pathao" | "steadfast";

export type AdminCourierFormView = {
  provider: CourierProviderId;
  enabled: boolean;
  hasSecrets: boolean;
  secretsKeyReady: boolean;
  fields: Record<string, string>;
};

export type CourierActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type CourierMutationResult =
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

function emptyView(provider: CourierProviderId): AdminCourierFormView {
  return {
    provider,
    enabled: false,
    hasSecrets: false,
    secretsKeyReady: courierSecretsKeyConfigured(),
    fields: {},
  };
}

export async function listAdminCourierViews(): Promise<{
  pathao: AdminCourierFormView;
  steadfast: AdminCourierFormView;
}> {
  const base = { pathao: emptyView("pathao"), steadfast: emptyView("steadfast") };
  if (!usesDatabase()) {
    return base;
  }
  const rows = await getPrisma().courierSetting.findMany({
    where: { provider: { in: ["pathao", "steadfast"] } },
  });
  for (const row of rows) {
    if (row.provider !== "pathao" && row.provider !== "steadfast") {
      continue;
    }
    base[row.provider] = {
      provider: row.provider,
      enabled: row.enabled,
      hasSecrets: Boolean(row.secretsCiphertext),
      secretsKeyReady: courierSecretsKeyConfigured(),
      fields: parseJsonObject(row.publicConfigJson),
    };
  }
  return base;
}

async function mergeSecrets(
  provider: CourierProviderId,
  nextSecrets: Record<string, string>,
): Promise<string | null> {
  const existing = await getPrisma().courierSetting.findUnique({
    where: { provider },
    select: { secretsCiphertext: true },
  });
  const previous = existing?.secretsCiphertext
    ? parseJsonObject(decryptCourierSecrets(existing.secretsCiphertext))
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
  return encryptCourierSecrets(JSON.stringify(merged));
}

export type DecryptedSteadfast = { apiKey: string; secretKey: string };
export type DecryptedPathao = {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId: string;
  live: boolean;
};

export async function loadDecryptedSteadfastFromDb(): Promise<DecryptedSteadfast | null> {
  if (!usesDatabase()) {
    return null;
  }
  const row = await getPrisma().courierSetting.findUnique({
    where: { provider: "steadfast" },
  });
  if (!row?.enabled || !row.secretsCiphertext) {
    return null;
  }
  const secrets = parseJsonObject(decryptCourierSecrets(row.secretsCiphertext));
  const apiKey = secrets.apiKey?.trim() ?? "";
  const secretKey = secrets.secretKey?.trim() ?? "";
  if (!apiKey || !secretKey) {
    return null;
  }
  return { apiKey, secretKey };
}

export async function loadDecryptedPathaoFromDb(): Promise<DecryptedPathao | null> {
  if (!usesDatabase()) {
    return null;
  }
  const row = await getPrisma().courierSetting.findUnique({
    where: { provider: "pathao" },
  });
  if (!row?.enabled || !row.secretsCiphertext) {
    return null;
  }
  const pub = parseJsonObject(row.publicConfigJson);
  const secrets = parseJsonObject(decryptCourierSecrets(row.secretsCiphertext));
  const clientId = secrets.clientId?.trim() ?? "";
  const clientSecret = secrets.clientSecret?.trim() ?? "";
  const username = secrets.username?.trim() ?? "";
  const password = secrets.password?.trim() ?? "";
  const storeId = pub.storeId?.trim() ?? "";
  if (!clientId || !clientSecret || !username || !password || !storeId) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    username,
    password,
    storeId,
    live: pub.mode?.trim().toLowerCase() === "live",
  };
}

/** Public-safe flags for the admin order list "Send to..." button. */
export async function listEnabledCouriers(): Promise<{
  pathao: boolean;
  steadfast: boolean;
}> {
  if (!usesDatabase()) {
    return { pathao: false, steadfast: false };
  }
  const rows = await getPrisma().courierSetting.findMany({
    where: { provider: { in: ["pathao", "steadfast"] }, enabled: true },
    select: { provider: true },
  });
  const enabled = new Set(rows.map((r) => r.provider));
  return { pathao: enabled.has("pathao"), steadfast: enabled.has("steadfast") };
}

export async function saveSteadfastCourier(input: {
  enabled: boolean;
  apiKey: string;
  secretKey: string;
  actor: CourierActor;
}): Promise<CourierMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Shipping settings need the database." };
  }
  if (!courierSecretsKeyConfigured()) {
    return {
      ok: false,
      formError:
        "Set COURIER_SECRETS_KEY in .env.local (min 16 characters) before saving secrets.",
    };
  }
  const secretsCiphertext = await mergeSecrets("steadfast", {
    apiKey: input.apiKey,
    secretKey: input.secretKey,
  });
  if (input.enabled && !secretsCiphertext) {
    return {
      ok: false,
      formError: "Enter the Steadfast API key and secret key (or keep existing).",
    };
  }
  const row = await getPrisma().courierSetting.upsert({
    where: { provider: "steadfast" },
    create: {
      provider: "steadfast",
      enabled: input.enabled,
      secretsCiphertext,
      secretsUpdatedAt: secretsCiphertext ? new Date() : null,
      updatedByStaffId: input.actor.staffId,
    },
    update: {
      enabled: input.enabled,
      secretsCiphertext,
      secretsUpdatedAt:
        input.apiKey.trim() || input.secretKey.trim() ? new Date() : undefined,
      updatedByStaffId: input.actor.staffId,
    },
    select: { id: true },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.COURIER_SETTING_UPDATE,
    entityType: "CourierSetting",
    entityId: row.id,
    metadata: { provider: "steadfast", enabled: input.enabled },
    ip: input.actor.ip,
  });
  return { ok: true };
}

export async function savePathaoCourier(input: {
  enabled: boolean;
  mode: string;
  storeId: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  actor: CourierActor;
}): Promise<CourierMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Shipping settings need the database." };
  }
  if (!courierSecretsKeyConfigured()) {
    return {
      ok: false,
      formError:
        "Set COURIER_SECRETS_KEY in .env.local (min 16 characters) before saving secrets.",
    };
  }
  const storeId = input.storeId.trim().slice(0, 60);
  if (input.enabled && !storeId) {
    return { ok: false, formError: "Enter the Pathao store id." };
  }
  const secretsCiphertext = await mergeSecrets("pathao", {
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    username: input.username,
    password: input.password,
  });
  if (input.enabled && !secretsCiphertext) {
    return {
      ok: false,
      formError:
        "Enter Pathao client id/secret and username/password (or keep existing).",
    };
  }
  const publicConfigJson = JSON.stringify({
    mode: input.mode.trim().slice(0, 20) || "sandbox",
    storeId,
  });
  const row = await getPrisma().courierSetting.upsert({
    where: { provider: "pathao" },
    create: {
      provider: "pathao",
      enabled: input.enabled,
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
        input.clientId.trim() ||
        input.clientSecret.trim() ||
        input.username.trim() ||
        input.password.trim()
          ? new Date()
          : undefined,
      updatedByStaffId: input.actor.staffId,
    },
    select: { id: true },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.COURIER_SETTING_UPDATE,
    entityType: "CourierSetting",
    entityId: row.id,
    metadata: { provider: "pathao", enabled: input.enabled, mode: input.mode },
    ip: input.actor.ip,
  });
  return { ok: true };
}
