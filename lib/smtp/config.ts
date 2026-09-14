/**
 * SMTP settings (P16-T04).
 *
 * Persists mailer type, host, port, username, encryption, and from fields.
 * Passwords stay in environment variables — never the database.
 * Outbound send lives in lib/mail/send.ts (used by Admin → Contacts
 * replies, AD-239); other transactional email is still deferred.
 * `DATA_SOURCE=mock` refuses writes.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  DEFAULT_SMTP_ENCRYPTION,
  DEFAULT_SMTP_MAILER,
  DEFAULT_SMTP_PORT,
  SMTP_FROM_NAME_MAX,
  SMTP_HOST_MAX,
  SMTP_PORT_MAX,
  SMTP_PORT_MIN,
  SMTP_USERNAME_MAX,
  normalizeEncryption,
  normalizeFromAddress,
  normalizeFromName,
  normalizeMailerType,
  normalizeSmtpHost,
  normalizeSmtpPort,
  normalizeSmtpUsername,
  type AdminSmtpConfig,
} from "@/lib/smtp/fields";

export type { AdminSmtpConfig } from "@/lib/smtp/fields";

export const SMTP_DB_REQUIRED =
  "SMTP changes need the database. Turn off DATA_SOURCE=mock to save.";

export type SmtpMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type SmtpActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const EMPTY_ADMIN: AdminSmtpConfig = {
  mailerType: DEFAULT_SMTP_MAILER,
  host: "",
  port: DEFAULT_SMTP_PORT,
  username: "",
  encryption: DEFAULT_SMTP_ENCRYPTION,
  fromAddress: "",
  fromName: "",
  updatedAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): SmtpMutationResult {
  return { ok: false, formError };
}

function toAdminConfig(row: {
  mailerType: string;
  host: string | null;
  port: number;
  username: string | null;
  encryption: string;
  fromAddress: string | null;
  fromName: string | null;
  updatedAt: Date;
}): AdminSmtpConfig {
  return {
    mailerType: normalizeMailerType(row.mailerType) ?? DEFAULT_SMTP_MAILER,
    host: row.host ?? "",
    port: normalizeSmtpPort(row.port) ?? DEFAULT_SMTP_PORT,
    username: row.username ?? "",
    encryption: normalizeEncryption(row.encryption) ?? DEFAULT_SMTP_ENCRYPTION,
    fromAddress: row.fromAddress ?? "",
    fromName: row.fromName ?? "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAdminSmtpConfig(): Promise<AdminSmtpConfig> {
  if (!usesDatabase()) {
    return EMPTY_ADMIN;
  }
  const row = await getPrisma().smtpConfiguration.findUnique({
    where: { id: "singleton" },
    select: {
      mailerType: true,
      host: true,
      port: true,
      username: true,
      encryption: true,
      fromAddress: true,
      fromName: true,
      updatedAt: true,
    },
  });
  if (!row) {
    return EMPTY_ADMIN;
  }
  return toAdminConfig(row);
}

export async function saveSmtpConfig(input: {
  mailerType: string;
  host: string;
  port: string;
  username: string;
  encryption: string;
  fromAddress: string;
  fromName: string;
  actor?: SmtpActor;
}): Promise<SmtpMutationResult> {
  if (!usesDatabase()) {
    return fail(SMTP_DB_REQUIRED);
  }

  const mailerType = normalizeMailerType(input.mailerType);
  if (mailerType == null) {
    return fail("Choose a supported mailer type.");
  }
  const host = normalizeSmtpHost(input.host);
  if (host == null) {
    return fail(`Host must be ${SMTP_HOST_MAX} characters or fewer.`);
  }
  const port = normalizeSmtpPort(input.port);
  if (port == null) {
    return fail(`Port must be between ${SMTP_PORT_MIN} and ${SMTP_PORT_MAX}.`);
  }
  const username = normalizeSmtpUsername(input.username);
  if (username == null) {
    return fail(`Username must be ${SMTP_USERNAME_MAX} characters or fewer.`);
  }
  const encryption = normalizeEncryption(input.encryption);
  if (encryption == null) {
    return fail("Choose a supported encryption mode.");
  }
  const fromAddress = normalizeFromAddress(input.fromAddress);
  if (fromAddress == null) {
    return fail("Enter a valid from address, or leave it blank.");
  }
  const fromName = normalizeFromName(input.fromName);
  if (fromName == null) {
    return fail(`From name must be ${SMTP_FROM_NAME_MAX} characters or fewer.`);
  }

  if (mailerType === "smtp" && !host) {
    return fail("Host is required for SMTP.");
  }

  const row = await getPrisma().smtpConfiguration.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      mailerType,
      host: host || null,
      port,
      username: username || null,
      encryption,
      fromAddress: fromAddress || null,
      fromName: fromName || null,
    },
    update: {
      mailerType,
      host: host || null,
      port,
      username: username || null,
      encryption,
      fromAddress: fromAddress || null,
      fromName: fromName || null,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.SMTP_UPDATE,
      entityType: "SmtpConfiguration",
      entityId: row.id,
      metadata: {
        mailerType,
        encryption,
        port,
        hasHost: Boolean(host),
        hasUsername: Boolean(username),
        hasFromAddress: Boolean(fromAddress),
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: row.id };
}
