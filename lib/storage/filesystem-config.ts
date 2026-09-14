/**
 * File system / storage driver + cache settings (Admin → Settings →
 * Filesystem). Persisted config only — see prisma/schema.prisma
 * FilesystemSettings for the "not actually wired to a real backend" notes.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  encryptStorageSecret,
  storageSecretsKeyConfigured,
} from "@/lib/storage/secret-crypto";

export type AdminFilesystemSettings = {
  localActive: boolean;
  s3Active: boolean;
  s3Key: string;
  s3Region: string;
  s3Bucket: string;
  s3HasSecret: boolean;
  backblazeActive: boolean;
  backblazeKeyId: string;
  backblazeBucket: string;
  backblazeRegion: string;
  backblazeHasKey: boolean;
  cacheDriver: string;
  sessionDriver: string;
  redisHost: string;
  redisPort: string;
  redisHasPassword: boolean;
  secretsKeyReady: boolean;
};

export type FilesystemMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type FilesystemActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const DEFAULTS: AdminFilesystemSettings = {
  localActive: true,
  s3Active: false,
  s3Key: "",
  s3Region: "ap-southeast-1",
  s3Bucket: "",
  s3HasSecret: false,
  backblazeActive: false,
  backblazeKeyId: "",
  backblazeBucket: "",
  backblazeRegion: "",
  backblazeHasKey: false,
  cacheDriver: "file",
  sessionDriver: "file",
  redisHost: "127.0.0.1",
  redisPort: "6379",
  redisHasPassword: false,
  secretsKeyReady: storageSecretsKeyConfigured(),
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export type StorageDriver = "local" | "s3" | "backblaze";

export const STORAGE_DRIVER_LABELS: Record<StorageDriver, string> = {
  local: "Local disk",
  s3: "Amazon S3",
  backblaze: "Backblaze B2",
};

/**
 * The upload system reads this to decide where a file actually goes.
 * S3/Backblaze have no client SDK wired yet (no credentials flow, no real
 * put/get/delete calls) — enabling either here is honestly reported to the
 * admin as "configured but not yet implemented" by the upload functions
 * rather than silently writing to local disk under a different provider's
 * name. Local disk stays the guaranteed fallback: if neither cloud provider
 * is active, uploads always work regardless of the `localActive` flag,
 * since it is the only real, working driver in this codebase.
 */
export async function getActiveStorageDriver(): Promise<StorageDriver> {
  const settings = await getFilesystemSettings();
  if (settings.s3Active) return "s3";
  if (settings.backblazeActive) return "backblaze";
  return "local";
}

export async function getFilesystemSettings(): Promise<AdminFilesystemSettings> {
  if (!usesDatabase()) {
    return DEFAULTS;
  }
  const row = await getPrisma().filesystemSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return DEFAULTS;
  }
  return {
    localActive: row.localActive,
    s3Active: row.s3Active,
    s3Key: row.s3Key ?? "",
    s3Region: row.s3Region ?? DEFAULTS.s3Region,
    s3Bucket: row.s3Bucket ?? "",
    s3HasSecret: Boolean(row.s3SecretCiphertext),
    backblazeActive: row.backblazeActive,
    backblazeKeyId: row.backblazeKeyId ?? "",
    backblazeBucket: row.backblazeBucket ?? "",
    backblazeRegion: row.backblazeRegion ?? "",
    backblazeHasKey: Boolean(row.backblazeKeyCiphertext),
    cacheDriver: row.cacheDriver,
    sessionDriver: row.sessionDriver,
    redisHost: row.redisHost ?? DEFAULTS.redisHost,
    redisPort: row.redisPort != null ? String(row.redisPort) : DEFAULTS.redisPort,
    redisHasPassword: Boolean(row.redisPasswordCiphertext),
    secretsKeyReady: storageSecretsKeyConfigured(),
  };
}

async function ensureRow() {
  await getPrisma().filesystemSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

async function audit(
  actor: FilesystemActor,
  section: string,
  metadata: Record<string, unknown>,
) {
  await writeAuditLog({
    actorType: "STAFF",
    actorId: actor.staffId,
    actorLabel: actor.email,
    action: AUDIT_ACTIONS.BUSINESS_SETTINGS_UPDATE,
    entityType: "FilesystemSettings",
    entityId: section,
    metadata,
    ip: actor.ip,
  });
}

export async function saveLocalStorageSettings(input: {
  localActive: boolean;
  actor: FilesystemActor;
}): Promise<FilesystemMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Filesystem settings need the database." };
  }
  await ensureRow();
  await getPrisma().filesystemSettings.update({
    where: { id: "singleton" },
    data: { localActive: input.localActive },
  });
  await audit(input.actor, "local", { localActive: input.localActive });
  return { ok: true };
}

export async function saveS3Settings(input: {
  s3Active: boolean;
  s3Key: string;
  s3Secret: string;
  s3Region: string;
  s3Bucket: string;
  actor: FilesystemActor;
}): Promise<FilesystemMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Filesystem settings need the database." };
  }
  const s3Key = input.s3Key.trim().slice(0, 200);
  const s3Region = input.s3Region.trim().slice(0, 60);
  const s3Bucket = input.s3Bucket.trim().slice(0, 120);
  if (input.s3Active && (!s3Key || !s3Bucket)) {
    return { ok: false, formError: "Enter the S3 access key and bucket." };
  }
  let s3SecretCiphertext: string | undefined;
  if (input.s3Secret.trim()) {
    if (!storageSecretsKeyConfigured()) {
      return {
        ok: false,
        formError:
          "Set STORAGE_SECRETS_KEY in .env.local (min 16 characters) before saving secrets.",
      };
    }
    s3SecretCiphertext = encryptStorageSecret(input.s3Secret.trim());
  }
  await ensureRow();
  await getPrisma().filesystemSettings.update({
    where: { id: "singleton" },
    data: {
      s3Active: input.s3Active,
      s3Key: s3Key || null,
      s3Region: s3Region || null,
      s3Bucket: s3Bucket || null,
      ...(s3SecretCiphertext !== undefined ? { s3SecretCiphertext } : {}),
    },
  });
  await audit(input.actor, "s3", { s3Active: input.s3Active });
  return { ok: true };
}

export async function saveBackblazeSettings(input: {
  backblazeActive: boolean;
  backblazeKeyId: string;
  backblazeApplicationKey: string;
  backblazeBucket: string;
  backblazeRegion: string;
  actor: FilesystemActor;
}): Promise<FilesystemMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Filesystem settings need the database." };
  }
  const backblazeKeyId = input.backblazeKeyId.trim().slice(0, 200);
  const backblazeBucket = input.backblazeBucket.trim().slice(0, 120);
  const backblazeRegion = input.backblazeRegion.trim().slice(0, 60);
  if (input.backblazeActive && (!backblazeKeyId || !backblazeBucket)) {
    return { ok: false, formError: "Enter the Backblaze key id and bucket." };
  }
  let backblazeKeyCiphertext: string | undefined;
  if (input.backblazeApplicationKey.trim()) {
    if (!storageSecretsKeyConfigured()) {
      return {
        ok: false,
        formError:
          "Set STORAGE_SECRETS_KEY in .env.local (min 16 characters) before saving secrets.",
      };
    }
    backblazeKeyCiphertext = encryptStorageSecret(
      input.backblazeApplicationKey.trim(),
    );
  }
  await ensureRow();
  await getPrisma().filesystemSettings.update({
    where: { id: "singleton" },
    data: {
      backblazeActive: input.backblazeActive,
      backblazeKeyId: backblazeKeyId || null,
      backblazeBucket: backblazeBucket || null,
      backblazeRegion: backblazeRegion || null,
      ...(backblazeKeyCiphertext !== undefined
        ? { backblazeKeyCiphertext }
        : {}),
    },
  });
  await audit(input.actor, "backblaze", {
    backblazeActive: input.backblazeActive,
  });
  return { ok: true };
}

export async function saveCacheSettings(input: {
  cacheDriver: string;
  sessionDriver: string;
  redisHost: string;
  redisPort: string;
  redisPassword: string;
  actor: FilesystemActor;
}): Promise<FilesystemMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Filesystem settings need the database." };
  }
  const cacheDriver = input.cacheDriver === "redis" ? "redis" : "file";
  const sessionDriver = input.sessionDriver === "redis" ? "redis" : "file";
  const redisHost = input.redisHost.trim().slice(0, 200);
  const redisPortNum = Number.parseInt(input.redisPort, 10);
  const redisPort =
    Number.isInteger(redisPortNum) && redisPortNum > 0 && redisPortNum <= 65535
      ? redisPortNum
      : null;
  if ((cacheDriver === "redis" || sessionDriver === "redis") && !redisHost) {
    return { ok: false, formError: "Enter the Redis host." };
  }
  let redisPasswordCiphertext: string | undefined;
  if (input.redisPassword.trim()) {
    if (!storageSecretsKeyConfigured()) {
      return {
        ok: false,
        formError:
          "Set STORAGE_SECRETS_KEY in .env.local (min 16 characters) before saving secrets.",
      };
    }
    redisPasswordCiphertext = encryptStorageSecret(input.redisPassword.trim());
  }
  await ensureRow();
  await getPrisma().filesystemSettings.update({
    where: { id: "singleton" },
    data: {
      cacheDriver,
      sessionDriver,
      redisHost: redisHost || null,
      redisPort,
      ...(redisPasswordCiphertext !== undefined
        ? { redisPasswordCiphertext }
        : {}),
    },
  });
  await audit(input.actor, "cache", { cacheDriver, sessionDriver });
  return { ok: true };
}
