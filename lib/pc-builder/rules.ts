/**
 * PC Builder compatibility rules (P14-T02).
 *
 * Rows live on `PCCompatibilityRule`. The storefront reads enabled types;
 * staff with `pc_builder.rules` can toggle them. Evaluation still lives in
 * the pure stub engine — T03 replaces that.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { MOCK_PC_BUILDER_RULES } from "@/lib/admin/pc-builder-admin-mock";
import type {
  CompatibilityRule,
  PcBuilderRuleType,
} from "@/lib/domain/pc-builder/rules";
import { getPrisma } from "@/lib/db/prisma";
import type { PcRuleType } from "@/lib/generated/prisma/enums";

export const RULES_DB_REQUIRED =
  "Compatibility rule changes need the database. Turn off DATA_SOURCE=mock to save.";

export type RuleMutationResult =
  { ok: true; key: string } | { ok: false; formError: string };

export type RuleActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const DOMAIN_RULE_TYPE = {
  SOCKET: "socket",
  RAM_TYPE: "ram_type",
  PSU_WATTAGE: "psu_wattage",
  FORM_FACTOR: "form_factor",
  STORAGE_INTERFACE: "storage_interface",
} as const satisfies Record<PcRuleType, PcBuilderRuleType>;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function toRule(row: {
  key: string;
  label: string;
  type: PcRuleType;
  description: string | null;
  isEnabled: boolean;
}): CompatibilityRule {
  return {
    key: row.key,
    label: row.label,
    type: DOMAIN_RULE_TYPE[row.type],
    description: row.description ?? "",
    enabled: row.isEnabled,
  };
}

async function recordRuleAudit(
  actor: RuleActor | undefined,
  record: { id: string; key: string },
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!actor) {
    return;
  }
  await writeAuditLog({
    actorType: "STAFF",
    actorId: actor.staffId,
    actorLabel: actor.email,
    action: AUDIT_ACTIONS.PC_RULE_UPDATE,
    entityType: "PCCompatibilityRule",
    entityId: record.id,
    metadata,
    ip: actor.ip,
  });
}

export async function listCompatibilityRules(): Promise<CompatibilityRule[]> {
  if (!usesDatabase()) {
    return MOCK_PC_BUILDER_RULES.map((rule) => ({ ...rule }));
  }
  const rows = await getPrisma().pCCompatibilityRule.findMany({
    select: {
      key: true,
      label: true,
      type: true,
      description: true,
      isEnabled: true,
    },
    orderBy: [{ type: "asc" }, { key: "asc" }],
  });
  return rows.map(toRule);
}

export async function listEnabledRuleTypes(): Promise<PcBuilderRuleType[]> {
  const rules = await listCompatibilityRules();
  return [
    ...new Set(rules.filter((rule) => rule.enabled).map((rule) => rule.type)),
  ];
}

export async function setCompatibilityRuleEnabled(input: {
  key: string;
  enabled: boolean;
  actor?: RuleActor;
}): Promise<RuleMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: RULES_DB_REQUIRED };
  }
  const key = input.key.trim();
  if (!key) {
    return { ok: false, formError: "That rule no longer exists." };
  }

  const existing = await getPrisma().pCCompatibilityRule.findUnique({
    where: { key },
    select: { id: true, key: true, isEnabled: true },
  });
  if (!existing) {
    return { ok: false, formError: "That rule no longer exists." };
  }
  if (existing.isEnabled === input.enabled) {
    return { ok: true, key: existing.key };
  }

  await getPrisma().pCCompatibilityRule.update({
    where: { id: existing.id },
    data: { isEnabled: input.enabled },
  });
  await recordRuleAudit(input.actor, existing, {
    key: existing.key,
    enabled: input.enabled,
  });
  return { ok: true, key: existing.key };
}

export async function setCompatibilityRulesEnabled(input: {
  items: Array<{ key: string; enabled: boolean }>;
  actor?: RuleActor;
}): Promise<RuleMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: RULES_DB_REQUIRED };
  }
  if (input.items.length === 0) {
    return { ok: false, formError: "Nothing to save." };
  }

  let lastKey = "";
  for (const item of input.items) {
    const result = await setCompatibilityRuleEnabled({
      key: item.key,
      enabled: item.enabled,
      actor: input.actor,
    });
    if (!result.ok) {
      return result;
    }
    lastKey = result.key;
  }
  return { ok: true, key: lastKey };
}
