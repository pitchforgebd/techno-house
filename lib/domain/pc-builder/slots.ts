import type { BuilderSlot } from "@/lib/data/types/catalog";

export type BuilderSlotMeta = {
  id: BuilderSlot;
  label: string;
  /** Required for a complete core build (display logic; not enforced in shell). */
  required: boolean;
  description: string;
};

/**
 * Canonical builder slots. Order matches the UX slot list.
 * Optional peripherals beyond `monitor` are deferred until product data exists.
 */
export const BUILDER_SLOTS: readonly BuilderSlotMeta[] = [
  {
    id: "cpu",
    label: "CPU",
    required: true,
    description: "Processor",
  },
  {
    id: "cpu_cooler",
    label: "CPU cooler",
    required: true,
    description: "Cooling for the CPU",
  },
  {
    id: "motherboard",
    label: "Motherboard",
    required: true,
    description: "Mainboard matching CPU socket",
  },
  {
    id: "ram",
    label: "RAM",
    required: true,
    description: "System memory",
  },
  {
    id: "gpu",
    label: "GPU",
    required: true,
    description: "Graphics card",
  },
  {
    id: "ssd",
    label: "SSD",
    required: true,
    description: "Primary solid-state storage",
  },
  {
    id: "hdd",
    label: "HDD",
    required: true,
    description: "Additional hard-disk storage",
  },
  {
    id: "psu",
    label: "PSU",
    required: true,
    description: "Power supply",
  },
  {
    id: "case",
    label: "Case",
    required: true,
    description: "Chassis",
  },
  {
    id: "case_fans",
    label: "Case fans",
    required: true,
    description: "Chassis cooling fans",
  },
  {
    id: "monitor",
    label: "Monitor",
    required: false,
    description: "Optional display",
  },
] as const;

export function getBuilderSlotMeta(
  id: BuilderSlot,
): BuilderSlotMeta | undefined {
  return BUILDER_SLOTS.find((slot) => slot.id === id);
}

export function requiredBuilderSlots(): BuilderSlotMeta[] {
  return BUILDER_SLOTS.filter((slot) => slot.required);
}
