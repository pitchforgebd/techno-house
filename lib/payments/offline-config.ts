/**
 * Cash-on-delivery display + availability (Admin → Payments → Offline).
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export const OFFLINE_LABEL_MAX = 60;
export const OFFLINE_INSTRUCTIONS_MAX = 300;

export type AdminOfflinePaymentConfig = {
  codEnabled: boolean;
  label: string;
  instructions: string;
  updatedAt: string | null;
};

export type OfflinePaymentMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type OfflinePaymentActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const DEFAULT_CONFIG: AdminOfflinePaymentConfig = {
  codEnabled: true,
  label: "Cash on delivery",
  instructions: "Pay in cash when the order arrives.",
  updatedAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export async function getOfflinePaymentConfig(): Promise<AdminOfflinePaymentConfig> {
  if (!usesDatabase()) {
    return DEFAULT_CONFIG;
  }
  const row = await getPrisma().offlinePaymentSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return DEFAULT_CONFIG;
  }
  return {
    codEnabled: row.codEnabled,
    label: row.label,
    instructions: row.instructions,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveOfflinePaymentConfig(input: {
  codEnabled: boolean;
  label: string;
  instructions: string;
  actor: OfflinePaymentActor;
}): Promise<OfflinePaymentMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Payment settings need the database." };
  }
  const label = input.label.trim().slice(0, OFFLINE_LABEL_MAX);
  const instructions = input.instructions.trim().slice(0, OFFLINE_INSTRUCTIONS_MAX);
  if (input.codEnabled && !label) {
    return { ok: false, formError: "Enter a display label." };
  }

  const row = await getPrisma().offlinePaymentSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", codEnabled: input.codEnabled, label, instructions },
    update: { codEnabled: input.codEnabled, label, instructions },
    select: { id: true },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.PAYMENT_GATEWAY_UPDATE,
    entityType: "OfflinePaymentSettings",
    entityId: row.id,
    ip: input.actor.ip,
    metadata: { codEnabled: input.codEnabled },
  });
  return { ok: true };
}
