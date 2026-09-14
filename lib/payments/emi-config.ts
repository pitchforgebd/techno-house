/**
 * EMI teaser display (Admin → Payments → EMI). Display-only — there is no
 * EMI lender/approval backend; this only controls what the storefront shows.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { EMI_TENURE_OPTIONS, type AdminEmiConfig } from "@/lib/payments/emi-shared";

export { EMI_TENURE_OPTIONS, type AdminEmiConfig };

export const EMI_PARTNER_NAME_MAX = 120;
export const EMI_INTEREST_NOTE_MAX = 300;

export type EmiMutationResult = { ok: true } | { ok: false; formError: string };

export type EmiActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const DEFAULT_CONFIG: AdminEmiConfig = {
  enabled: false,
  tenureMonths: [3, 6, 12],
  partnerName: "",
  interestNote: "",
  minOrderAmount: 0,
  updatedAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function parseTenureMonths(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (n): n is number =>
        typeof n === "number" && EMI_TENURE_OPTIONS.includes(n as 3 | 6 | 12),
    );
  } catch {
    return [];
  }
}

export async function getEmiConfig(): Promise<AdminEmiConfig> {
  if (!usesDatabase()) {
    return DEFAULT_CONFIG;
  }
  const row = await getPrisma().emiSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return DEFAULT_CONFIG;
  }
  return {
    enabled: row.enabled,
    tenureMonths: parseTenureMonths(row.tenureMonthsJson),
    partnerName: row.partnerName ?? "",
    interestNote: row.interestNote ?? "",
    minOrderAmount: row.minOrderAmount,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveEmiConfig(input: {
  enabled: boolean;
  tenureMonths: number[];
  partnerName: string;
  interestNote: string;
  minOrderAmount: string;
  actor: EmiActor;
}): Promise<EmiMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Payment settings need the database." };
  }
  const tenureMonths = input.tenureMonths.filter((n) =>
    EMI_TENURE_OPTIONS.includes(n as 3 | 6 | 12),
  );
  const partnerName = input.partnerName.trim().slice(0, EMI_PARTNER_NAME_MAX);
  const interestNote = input.interestNote.trim().slice(0, EMI_INTEREST_NOTE_MAX);
  const minOrderAmount = Number.parseInt(input.minOrderAmount, 10);
  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
    return { ok: false, formError: "Minimum order amount must be 0 or more." };
  }
  if (input.enabled && tenureMonths.length === 0) {
    return { ok: false, formError: "Enable at least one tenure option." };
  }

  const row = await getPrisma().emiSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      enabled: input.enabled,
      tenureMonthsJson: JSON.stringify(tenureMonths),
      partnerName: partnerName || null,
      interestNote: interestNote || null,
      minOrderAmount,
    },
    update: {
      enabled: input.enabled,
      tenureMonthsJson: JSON.stringify(tenureMonths),
      partnerName: partnerName || null,
      interestNote: interestNote || null,
      minOrderAmount,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.PAYMENT_GATEWAY_UPDATE,
    entityType: "EmiSettings",
    entityId: row.id,
    ip: input.actor.ip,
    metadata: { enabled: input.enabled, tenureMonths },
  });
  return { ok: true };
}
