export const PC_RULE_TYPES = [
  "socket",
  "ram_type",
  "psu_wattage",
  "form_factor",
  "storage_interface",
] as const;

export type PcBuilderRuleType = (typeof PC_RULE_TYPES)[number];

export type CompatibilityRule = {
  key: string;
  label: string;
  type: PcBuilderRuleType;
  description: string;
  enabled: boolean;
};

const RULE_TYPE_SET = new Set<string>(PC_RULE_TYPES);

export function isPcBuilderRuleType(value: string): value is PcBuilderRuleType {
  return RULE_TYPE_SET.has(value);
}

export function enabledRuleTypeSet(
  rules: readonly CompatibilityRule[],
): ReadonlySet<PcBuilderRuleType> {
  return new Set(rules.filter((rule) => rule.enabled).map((rule) => rule.type));
}

/**
 * `undefined` means every implemented type runs (callers that have not
 * loaded the rule table yet). A set — even empty — is authoritative.
 */
export function isRuleTypeEnabled(
  enabled: ReadonlySet<PcBuilderRuleType> | undefined,
  type: PcBuilderRuleType,
): boolean {
  return enabled == null || enabled.has(type);
}
