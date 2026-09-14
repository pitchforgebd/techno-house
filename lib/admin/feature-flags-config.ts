/**
 * Feature Activation toggles (Admin → Settings → Features).
 *
 * Persists on/off state only — none of these flags are read by any
 * enforcement code yet (no maintenance-mode gate, no guest-checkout gate,
 * etc.). See lib/admin/feature-flags-shared.ts for the fixed flag catalogue.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_IDS,
} from "@/lib/admin/feature-flags-shared";

export type FeatureFlagMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type FeatureFlagActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export async function getFeatureFlagStates(): Promise<Record<string, boolean>> {
  if (!usesDatabase()) {
    return { ...FEATURE_FLAG_DEFAULTS };
  }
  const rows = await getPrisma().featureFlagSetting.findMany({
    where: { id: { in: FEATURE_FLAG_IDS } },
  });
  const saved = new Map(rows.map((row) => [row.id, row.enabled]));
  return Object.fromEntries(
    FEATURE_FLAG_IDS.map((id) => [
      id,
      saved.get(id) ?? FEATURE_FLAG_DEFAULTS[id] ?? false,
    ]),
  );
}

/** Single-flag read for a storefront/admin call site that only cares about one toggle. */
export async function isFeatureFlagEnabled(id: string): Promise<boolean> {
  const states = await getFeatureFlagStates();
  return states[id] ?? FEATURE_FLAG_DEFAULTS[id] ?? false;
}

export async function saveFeatureFlagStates(input: {
  flags: Record<string, boolean>;
  actor: FeatureFlagActor;
}): Promise<FeatureFlagMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Feature settings need the database." };
  }
  const entries = Object.entries(input.flags).filter(([id]) =>
    FEATURE_FLAG_IDS.includes(id),
  );
  if (entries.length === 0) {
    return { ok: false, formError: "No valid feature flags to save." };
  }

  const prisma = getPrisma();
  await prisma.$transaction(
    entries.map(([id, enabled]) =>
      prisma.featureFlagSetting.upsert({
        where: { id },
        create: { id, enabled },
        update: { enabled },
      }),
    ),
  );

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.BUSINESS_SETTINGS_UPDATE,
    entityType: "FeatureFlagSetting",
    entityId: "bulk",
    metadata: { flags: Object.fromEntries(entries) },
    ip: input.actor.ip,
  });
  return { ok: true };
}
