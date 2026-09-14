"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  setCompatibilityRuleEnabled,
  setCompatibilityRulesEnabled,
  type RuleMutationResult,
} from "@/lib/pc-builder/rules";

async function guardOrigin(): Promise<RuleMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function setCompatibilityRuleEnabledAction(input: {
  key: string;
  enabled: boolean;
}): Promise<RuleMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("pc_builder.rules");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return setCompatibilityRuleEnabled({
    key: input.key,
    enabled: input.enabled,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}

export async function saveCompatibilityRulesAction(
  items: Array<{ key: string; enabled: boolean }>,
): Promise<RuleMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("pc_builder.rules");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return setCompatibilityRulesEnabled({
    items,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}
