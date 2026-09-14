import type {
  CompatibilityRule,
  PcBuilderRuleType,
} from "@/lib/domain/pc-builder/rules";

export type { PcBuilderRuleType };
export type AdminPcBuilderRule = CompatibilityRule;

/** Mock PC Builder compatibility rules. */
export const MOCK_PC_BUILDER_RULES: AdminPcBuilderRule[] = [
  {
    key: "rule-socket",
    label: "CPU socket match",
    type: "socket",
    description:
      "CPU socket must match motherboard socket (AM5, LGA1700, etc.).",
    enabled: true,
  },
  {
    key: "rule-ram",
    label: "RAM type match",
    type: "ram_type",
    description: "RAM generation (DDR4 / DDR5) must match motherboard support.",
    enabled: true,
  },
  {
    key: "rule-psu",
    label: "PSU wattage headroom",
    type: "psu_wattage",
    description:
      "PSU wattage must exceed estimated CPU + GPU draw with 20% headroom.",
    enabled: true,
  },
  {
    key: "rule-case",
    label: "Case form factor",
    type: "form_factor",
    description:
      "Motherboard form factor must fit selected case (ATX, mATX, ITX).",
    enabled: true,
  },
  {
    key: "rule-storage",
    label: "Storage interface",
    type: "storage_interface",
    description: "M.2 NVMe slots validated against motherboard PCIe lanes.",
    enabled: false,
  },
];
